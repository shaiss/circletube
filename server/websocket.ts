import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage, Server } from 'http';
import type { Duplex } from 'stream';
import type { Express, Request, Response } from 'express';
import { storage } from './storage';
import { getSessionMiddleware } from './auth';

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

/**
 * Build the trusted Origin allowlist for `/ws` upgrades.
 * Env names only (no secret values):
 * - WS_ALLOWED_ORIGINS: comma-separated full origins (e.g. https://app.example.com)
 * - APP_ORIGIN / PUBLIC_APP_URL: optional single-origin fallbacks if set
 * In non-production, typical local Vite/dev origins are always included too.
 * In production, the list must come from those env vars; an empty list rejects all.
 */
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

/**
 * Browsers always send Origin on WebSocket upgrades. Missing Origin is
 * rejected in every environment (non-browser clients must not skip the check).
 */
function isTrustedOrigin(origin: string | undefined): boolean {
  if (!origin) {
    return false;
  }
  const normalized = origin.replace(/\/$/, '');
  return getAllowedOrigins().has(normalized);
}

/**
 * Authenticate a `/ws` upgrade with the same express-session cookie, store,
 * and secret as the HTTP API (server/auth.ts + server/sessionStore.ts).
 * Resolves the passport-serialized user id, or null when the request has no
 * logged-in session. Never trusts client-supplied tokens.
 */
function authenticateUpgrade(request: IncomingMessage): Promise<UpgradeAuth | null> {
  const sessionMiddleware = getSessionMiddleware();
  const req = request as Request;

  return new Promise((resolve, reject) => {
    // express-session only needs req; a stub res is fine because the upgrade
    // never writes an HTTP response through Express (saveUninitialized: false).
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

        // Mirror passport.deserializeUser: the session must point at a real user.
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

/**
 * Initialize WebSocket server
 * @param server HTTP server instance
 * @param app Express app instance
 */
export function initializeWebSocketServer(server: Server, app: Express) {
  console.log('[WebSocket] Initializing WebSocket server');
  
  // Create WebSocket server attached to the HTTP server
  const wss = new WebSocketServer({ 
    noServer: true,
    path: '/ws',
  });

  // Handle HTTP server upgrade event to establish WebSocket connection
  server.on('upgrade', (request, socket, head) => {
    console.log('[WebSocket] Received upgrade request for path:', request.url);
    
    // Parse the URL to handle just the path portion, ignoring query params
    const requestUrl = new URL(
      request.url || '', 
      `http://${request.headers.host}`
    );
    
    // Only handle WebSocket upgrade requests for /ws path
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
      // Not a WebSocket upgrade request for our path
      console.log('[WebSocket] Ignoring non-WebSocket path:', requestUrl.pathname);
      socket.destroy();
    }
  });

  // Handle new WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    console.log('[WebSocket] New connection established');
    
    const extWs = ws as ExtendedWebSocket;
    extWs.isAlive = true;
    clients.add(extWs);

    // Send initial welcome message
    ws.send(JSON.stringify({
      type: 'server-info',
      message: 'WebSocket connection established',
      timestamp: new Date().toISOString()
    }));

    // Handle incoming messages
    ws.on('message', async (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('[WebSocket] Received message:', data.type);

        // Handle ping messages
        if (data.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
          return;
        }

        // Legacy in-band authenticate: the socket is already authenticated by
        // the session cookie at upgrade time, so just confirm. Client tokens
        // are ignored (no unsigned or JWT token path).
        if (data.type === 'authenticate') {
          handleAuthentication(extWs);
          return;
        }

        // Handle other message types (requires authentication)
        if (!extWs.userId) {
          ws.send(JSON.stringify({
            type: 'error',
            code: 401,
            message: 'Authentication required'
          }));
          return;
        }

        // Process other message types as needed
        // ...

      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Error processing message'
        }));
      }
    });

    // Handle WebSocket connection close
    ws.on('close', () => {
      console.log('[WebSocket] Connection closed');
      clients.delete(extWs);
    });

    // Handle errors
    ws.on('error', (error) => {
      console.error('[WebSocket] Connection error:', error);
      clients.delete(extWs);
    });

    // Setup ping/pong for connection health checks
    extWs.on('pong', () => {
      extWs.isAlive = true;
    });
  });

  // Setup interval for ping/pong health checks
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
  }, 30000); // Check every 30 seconds

  // Clean up interval on server close
  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('[WebSocket] Server initialized');
  return wss;
}

/**
 * Reply to a legacy in-band `authenticate` message. Authentication happens at
 * upgrade time from the session cookie; this never changes ws.userId.
 */
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

/**
 * Close every open `/ws` socket tied to a sessionID (e.g. after logout
 * destroys the session). Client-only close on one tab is not enough.
 */
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
    console.log(`[WebSocket] Closing socket for ended session ${sessionID}`);
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

/**
 * Broadcast a message to all authenticated clients, or only to specific users
 * when userIds is provided. Unauthenticated sockets never receive broadcasts.
 */
export function broadcastWebSocketMessage(message: any, userIds?: number[]) {
  const serializedMessage = JSON.stringify(message);
  
  // Using forEach instead of for...of to avoid iteration issues
  clients.forEach(client => {
    // Never deliver to unauthenticated sockets (upgrade auth should prevent
    // them; this is defense in depth)
    if (!client.userId) {
      return;
    }
    
    // Send only to specific users if userIds is provided
    if (userIds && !userIds.includes(client.userId)) {
      return;
    }
    
    // Send the message if client is connected
    if (client.readyState === WebSocket.OPEN) {
      client.send(serializedMessage);
    }
  });
}
