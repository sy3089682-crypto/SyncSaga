import { Router, Request, Response } from 'express';

const router = Router();

/**
 * OpenAPI 3.0 specification for SyncSaga API v1.
 *
 * This spec is served at /api/v1/docs (HTML) and /api/v1/openapi.json (JSON).
 * It can be used with Swagger UI, Postman, or code generation tools.
 */
const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'SyncSaga API',
    description: 'Realtime anime watch-party platform API',
    version: '1.0.0',
    contact: {
      name: 'SyncSaga',
    },
  },
  servers: [
    { url: '/api/v1', description: 'API v1' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: { type: 'object' },
              requestId: { type: 'string', format: 'uuid' },
            },
          },
        },
      },
      Room: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          is_private: { type: 'boolean' },
          max_users: { type: 'integer' },
          host_id: { type: 'string', format: 'uuid' },
          playback_state: { type: 'string', enum: ['playing', 'paused', 'buffering'] },
          current_timestamp: { type: 'number' },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
      CreateRoomRequest: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string', maxLength: 100 },
          description: { type: 'string', maxLength: 500 },
          isPrivate: { type: 'boolean' },
          maxUsers: { type: 'integer', minimum: 1, maximum: 50 },
          password: { type: 'string' },
          animeTitle: { type: 'string' },
          animeMediaId: { type: 'integer' },
        },
      },
      SyncEvent: {
        type: 'object',
        required: ['room_id', 'type', 'timestamp'],
        properties: {
          room_id: { type: 'string' },
          type: { type: 'string', enum: ['play', 'pause', 'seek', 'speed', 'episode', 'fullscreen', 'buffering', 'ready'] },
          timestamp: { type: 'number', minimum: 0 },
          playback_speed: { type: 'number', minimum: 0, maximum: 16 },
          episode: { type: 'string' },
        },
      },
      ChatMessage: {
        type: 'object',
        required: ['roomId', 'content'],
        properties: {
          roomId: { type: 'string' },
          content: { type: 'string', maxLength: 2000 },
          type: { type: 'string', enum: ['text', 'gif', 'reaction', 'system'] },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          username: { type: 'string' },
          display_name: { type: 'string', nullable: true },
          avatar_url: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['online', 'offline', 'away', 'watching'] },
        },
      },
      Clip: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          user_id: { type: 'string', format: 'uuid' },
          room_id: { type: 'string', format: 'uuid', nullable: true },
          anime_title: { type: 'string' },
          episode_number: { type: 'integer', nullable: true },
          start_time: { type: 'number' },
          end_time: { type: 'number' },
          title: { type: 'string', nullable: true },
          description: { type: 'string', nullable: true },
          created_at: { type: 'string', format: 'date-time' },
        },
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/auth/register': {
      post: {
        summary: 'Register a new account',
        security: [],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateRoomRequest' } } },
        },
        responses: { '201': { description: 'Account created' }, '400': { description: 'Validation error' } },
      },
    },
    '/auth/login': {
      post: {
        summary: 'Login with email and password',
        security: [],
        responses: { '200': { description: 'Login successful' }, '401': { description: 'Invalid credentials' } },
      },
    },
    '/auth/refresh': {
      post: {
        summary: 'Refresh access token',
        security: [],
        responses: { '200': { description: 'New access token' }, '401': { description: 'Invalid refresh token' } },
      },
    },
    '/rooms': {
      get: { summary: 'List public rooms', responses: { '200': { description: 'List of rooms' } } },
      post: { summary: 'Create a new room', responses: { '201': { description: 'Room created' } } },
    },
    '/rooms/{id}': {
      get: { summary: 'Get room details', responses: { '200': { description: 'Room details' }, '404': { description: 'Room not found' } } },
      delete: { summary: 'Delete room (host only)', responses: { '204': { description: 'Deleted' }, '403': { description: 'Forbidden' } } },
    },
    '/rooms/{id}/join': {
      post: { summary: 'Join a room', responses: { '200': { description: 'Joined' }, '403': { description: 'Wrong password or full' } } },
    },
    '/rooms/{id}/leave': {
      post: { summary: 'Leave a room', responses: { '204': { description: 'Left' } } },
    },
    '/clips': {
      get: { summary: 'Browse clips', responses: { '200': { description: 'List of clips' } } },
      post: { summary: 'Create a clip', responses: { '201': { description: 'Clip created' } } },
    },
    '/clips/{id}': {
      get: { summary: 'Get a clip', responses: { '200': { description: 'Clip details' }, '404': { description: 'Not found' } } },
      delete: { summary: 'Delete a clip (owner only)', responses: { '204': { description: 'Deleted' } } },
    },
    '/ai/recommendations': {
      post: { summary: 'Get anime recommendations', responses: { '200': { description: 'Recommendations' } } },
    },
    '/ai/summarize': {
      post: { summary: 'Summarize chat messages', responses: { '200': { description: 'Summary' } } },
    },
    '/ai/recap': {
      post: { summary: 'Generate episode recap', responses: { '200': { description: 'Recap' } } },
    },
    '/features': {
      get: { summary: 'List feature flags', responses: { '200': { description: 'Feature flags' } } },
    },
    '/features/{flag}': {
      get: { summary: 'Get a specific feature flag', responses: { '200': { description: 'Flag status' } } },
    },
  },
};

router.get('/openapi.json', (_req: Request, res: Response) => {
  res.json(openApiSpec);
});

router.get('/docs', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>SyncSaga API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({ url: '/api/v1/openapi.json', dom_id: '#swagger-ui' });
    };
  </script>
</body>
</html>`);
});

export const docsRouter = router;
