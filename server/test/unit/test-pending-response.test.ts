/**
 * Route-level coverage for POST /api/posts/test-pending-response (#36).
 * Mounts the real postRoutes router with storage/scheduler mocks.
 */
import express, { Express, Request, Response, NextFunction } from 'express';
import request from 'supertest';

jest.mock('../../storage', () => ({
  storage: {
    getPost: jest.fn(),
    getAiFollower: jest.fn(),
    getCircleFollowers: jest.fn(),
    createPendingResponse: jest.fn(),
    getCircle: jest.fn(),
    getCircleMembers: jest.fn(),
    getUserPendingInvitations: jest.fn(),
  },
}));

jest.mock('../../response-scheduler', () => ({
  ResponseScheduler: {
    getInstance: () => ({ start: jest.fn(), stop: jest.fn() }),
  },
}));

jest.mock('../../context-manager', () => ({
  ThreadContextManager: {
    getInstance: () => ({}),
  },
}));

jest.mock('../../thread-manager', () => ({
  ThreadManager: {
    getThreadedInteractions: jest.fn().mockResolvedValue([]),
  },
}));

import { storage } from '../../storage';
import postRoutes from '../../routes/postRoutes';

const mockedStorage = storage as unknown as {
  getPost: jest.Mock;
  getAiFollower: jest.Mock;
  getCircleFollowers: jest.Mock;
  createPendingResponse: jest.Mock;
  getCircle: jest.Mock;
  getCircleMembers: jest.Mock;
  getUserPendingInvitations: jest.Mock;
};

function buildApp(authenticate: boolean, userId = 1): Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.isAuthenticated = (() => authenticate) as typeof req.isAuthenticated;
    if (authenticate) {
      (req as any).user = { id: userId };
    }
    next();
  });
  app.use('/api/posts', postRoutes);
  return app;
}

describe('POST /api/posts/test-pending-response', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.clearAllMocks();
  });

  it('returns 401 for unauthenticated requests outside production', async () => {
    process.env.NODE_ENV = 'test';
    const app = buildApp(false);

    const response = await request(app)
      .post('/api/posts/test-pending-response')
      .send({ postId: 1, followerId: 1 });

    expect(response.status).toBe(401);
    expect(mockedStorage.createPendingResponse).not.toHaveBeenCalled();
  });

  it('returns 404 in production even when authenticated', async () => {
    process.env.NODE_ENV = 'production';
    const app = buildApp(true);

    const response = await request(app)
      .post('/api/posts/test-pending-response')
      .send({ postId: 1, followerId: 1 });

    expect(response.status).toBe(404);
    expect(mockedStorage.createPendingResponse).not.toHaveBeenCalled();
  });

  it('returns 403 when the caller cannot access the post circle', async () => {
    process.env.NODE_ENV = 'test';
    const app = buildApp(true, 42);

    mockedStorage.getPost.mockResolvedValue({
      id: 1,
      circleId: 7,
      content: 'secret',
      userId: 1,
    });
    mockedStorage.getAiFollower.mockResolvedValue({
      id: 9,
      userId: 1,
      name: 'Bot',
    });
    mockedStorage.getCircle.mockResolvedValue({ id: 7, userId: 1 });
    mockedStorage.getCircleMembers.mockResolvedValue([]);
    mockedStorage.getUserPendingInvitations.mockResolvedValue([]);

    const response = await request(app)
      .post('/api/posts/test-pending-response')
      .send({ postId: 1, followerId: 9 });

    expect(response.status).toBe(403);
    expect(mockedStorage.createPendingResponse).not.toHaveBeenCalled();
  });
});
