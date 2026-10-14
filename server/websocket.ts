import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'http';
import type { Duplex } from 'stream';
import type { Express, Request, Response } from 'express';
import { storage } from './storage';
import { getSessionMiddleware } from './auth';
import { getSession } from './sessionStore';

// WebSocket client connections
interface ExtendedWebSocket extends WebSocket {
  isAlive: boolean;
  userId?: number;
  sessionID?: string;
}

// Active WebSocket connections
const clients = new Set<ExtendedWebSocket>();

/** Local Vite / Express origins allowed when NODE_ENV !== 'production'. */
const DEV_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5000',
  'http://127.0.0.1:5000',
] as const;

interface UpgradeAuth {
  userId: number;
  sessionID?: string;
}

function getAllowedOrigins(): Set<string> {
  const origins = new Set<string>();

  const fromList = process.env.WS_ALLOWED_ORIGINS;
  if (fromList) {
    for (const part of fromList.split(',')) {
      const trimmed = part.trim().replace(/\/$/, '');
      if (trimmed) origins.add(trimmed);
    }
  }

  for (const key of ['APP_ORIGIN', 'PUBLIC_APP_URL'] as const) {
    const value = process.env[key]?.trim();
    if (value) origins.add(value.replace(/\/$/, ''));
  }

  if (process.env.NODE_ENV !== 'production') {
    for (const origin of DEV_ALLOWED_ORIGINS) {
      origins.add(origin);
    }
  }

  return origins;
}

function isTrustedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }
  const normalized = origin.replace(/\/$/, '');
  return getAllowedOrigins().has(normalized);
}

function authenticateUpgrade(request: IncomingMessage): Promise<UpgradeAuth | null> {
  const sessionMiddleware = getSessionMiddleware();
  const req = request as Request;

  return new Promise((resolve, reject) => {
    sessionMiddleware(req, {} as Response, async (err?: unknown) => {
      if (err) {
        reject(err);
        return;
      }

      try {
        const passportData = (req.session as unknown as { passport?: { user?: unknown } } | undefined)?.passport;
        const userId = Number(passportData?.user);

        if (!Number.isInteger(userId) || userId <= 0) {
          resolve(null);
          return;
        }

        const user = await storage.getUser(userId);
        if (!user) {
          resolve(null);
          return;
        }

        resolve({ userId: user.id, sessionID: req.sessionID });
      } catch (lookupError) {
        reject(lookupError);
      }
    });
  });
}

function rejectUpgrade(socket: Duplex, status: number, reason: string) {
  if (!socket.destroyed) {
    socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  }
  socket.destroy();
}

function onUpgradeSocketError(error: Error) {
  console.error('[WebSocket] Socket error during upgrade:', error);
}

export function initializeWebSocketServer(server: Server, app: Express) {
  console.log('[WebSocket] Initializing WebSocket server');
  
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws',
  });

  server.on('upgrade', (request, socket, head) => {
    console.log('[WebSocket] Received upgrade request for path:', request.url);
    
    const requestUrl = new URL(
      request.url || '', 
      `http://${request.headers.host}`
    );
    
    if (requestUrl.pathname === '/ws') {
      console.log('[WebSocket] Processing WebSocket upgrade for /ws path');
      socket.on('error', onUpgradeSocketError);

      const originHeader = request.headers.origin;
      const origin = typeof originHeader === 'string' ? originHeader : undefined;
      if (!isTrustedOrigin(origin)) {
        console.warn('[WebSocket] Rejecting /ws upgrade: missing or untrusted Origin', origin ?? '(none)');
        rejectUpgrade(socket, 403, 'Forbidden');
        return;
      }

      authenticateUpgrade(request)
        .then((auth) => {
          if (!auth) {
            console.warn('[WebSocket] Rejecting /ws upgrade: no authenticated session');
            rejectUpgrade(socket, 401, 'Unauthorized');
            return;
          }

          socket.removeListener('error', onUpgradeSocketError);
          wss.handleUpgrade(request, socket, head, (ws) => {
            const extWs = ws as ExtendedWebSocket;
            extWs.userId = auth.userId;
            extWs.sessionID = auth.sessionID;
            console.log(`[WebSocket] Upgrade successful for user ${auth.userId}, emitting connection event`);
            wss.emit('connection', ws, request);
          });
        })
        .catch((error) => {
          console.error('[WebSocket] Error authenticating upgrade:', error);
          rejectUpgrade(socket, 500, 'Internal Server Error');
        });
    } else {
      console.log('[WebSocket] Ignoring non-WebSocket path:', requestUrl.pathname);
      socket.destroy();
    }
  });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] New connection established');
    
    const extWs = ws as ExtendedWebSocket;
    extWs.isAlive = true;
    clients.add(extWs);

    ws.send(JSON.stringify({
      type: 'server-info',
      message: 'WebSocket connection established',
      timestamp: new Date().toISOString()
    }));

    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('[WebSocket] Received message:', data.type);

        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          return;
        }

        if (data.type === 'authenticate') {
          handleAuthentication(extWs);
          return;
        }

        if (!extWs.userId) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 401,
            message: 'Authentication required'
          }));
          return;
        }

      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing message'
        }));
      }
    });

    ws.on('close', () => {
      console.log('[WebSocket] Connection closed');
      clients.delete(extWs);
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      clients.delete(extWs);
    });

    extWs.on('pong', () => {
      extWs.isAlive = true;
    });
  });

  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      
      if (extWs.isAlive === false) {
        console.log('[WebSocket] Terminating inactive connection');
        extWs.terminate();
        clients.delete(extWs);
        return;
      }
      
      extWs.isAlive = false;
      extWs.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('[WebSocket] Server initialized');
  return wss;
}

function handleAuthentication(ws: ExtendedWebSocket) {
  if (!ws.userId) {
    ws.send(JSON.stringify({
      type: 'error',
      code: 401,
      message: 'Authentication required'
    }));
    return;
  }

  ws.send(JSON.stringify({
    type: 'auth-success',
    userId: ws.userId,
    timestamp: new Date().toISOString()
  }));
}

export function closeWebSocketsForSession(sessionID: string) {
  if (!sessionID) {
    return;
  }

  const toClose: ExtendedWebSocket[] = [];
  clients.forEach((client) => {
    if (client.sessionID === sessionID) {
      toClose.push(client);
    }
  });

  for (const client of toClose) {
    console.log(`[WebSocket] Closing socket for ended session (user ${client.userId ?? 'unknown'})`);
    try {
      if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
        client.close(1000, 'Session ended');
      } else {
        client.terminate();
      }
    } catch (error) {
      console.error('[WebSocket] Error closing socket on session end:', error);
      try {
        client.terminate();
      } catch {
        // ignore
      }
    }
    clients.delete(client);
  }
}

async function isSessionStillValid(sessionID: string | undefined): Promise<boolean> {
  if (!sessionID) {
    return false;
  }

  try {
    const sess = await getSession(sessionID);
    if (!sess) {
      return false;
    }
    const passportData = (sess as { passport?: { user?: unknown } }).passport;
    const userId = Number(passportData?.user);
    return Number.isInteger(userId) && userId > 0;
  } catch (error) {
    console.error('[WebSocket] Session revalidation failed:', error);
    return false;
  }
}

/**
 * Broadcast a message to all authenticated clients, or only to specific users
 * when userIds is provided. Unauthenticated sockets never receive broadcasts.
 * Revalidates each socket's sessionID against the store before send so idle
 * expiry (no logout) stops delivery and closes those sockets (#16).
 */
export async function broadcastWebSocketMessage(message: any, userIds?: number[]) {
  let serializedMessage: string;
  try {
    serializedMessage = JSON.stringify(message);
  } catch (error) {
    console.error('[WebSocket] Failed to serialize broadcast message:', error);
    return;
  }

  const sessionValidity = new Map<string, boolean>();
  const expiredSessions = new Set<string>();
  const snapshot = Array.from(clients);

  for (const client of snapshot) {
    if (!client.userId) {
      continue;
    }

    if (userIds && !userIds.includes(client.userId)) {
      continue;
    }

    const sid = client.sessionID;
    let valid: boolean;
    if (!sid) {
      valid = false;
    } else if (sessionValidity.has(sid)) {
      valid = sessionValidity.get(sid)!;
    } else {
      valid = await isSessionStillValid(sid);
      sessionValidity.set(sid, valid);
    }

    if (!valid) {
      if (sid) {
        expiredSessions.add(sid);
      } else {
        console.log(`[WebSocket] Closing socket with no session (user ${client.userId})`);
        try {
          if (client.readyState === WebSocket.OPEN || client.readyState === WebSocket.CONNECTING) {
            client.close(1000, 'Session ended');
          } else {
            client.terminate();
          }
        } catch (error) {
          console.error('[WebSocket] Error closing socket without session:', error);
          try {
            client.terminate();
          } catch {
            // ignore
          }
        }
        clients.delete(client);
      }
      continue;
    }

    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(serializedMessage);
      } catch (error) {
        console.error(`[WebSocket] Failed to send to user ${client.userId}:`, error);
      }
    }
  }

  for (const sid of Array.from(expiredSessions)) {
    closeWebSocketsForSession(sid);
  }
}
