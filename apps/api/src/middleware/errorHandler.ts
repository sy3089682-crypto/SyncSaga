import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 400,
    public details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ErrorCodes = {
  ROOM_NOT_FOUND: 'ROOM_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  ROOM_FULL: 'ROOM_FULL',
  BANNED: 'BANNED',
  NOT_HOST: 'NOT_HOST',
  NOT_IN_ROOM: 'NOT_IN_ROOM',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  FORBIDDEN: 'FORBIDDEN',
  SYNC_LOCKED: 'SYNC_LOCKED',
  HOST_ACTIVE: 'HOST_ACTIVE',
  HOST_STALE: 'HOST_STALE',
  PROFILE_NOT_FOUND: 'PROFILE_NOT_FOUND',
} as const;

/**
 * Centralized error handler — must be registered last (after all routes).
 *
 * - AppError instances return their specific status code and details.
 * - All other errors are logged with request ID for correlation and
 *   return a generic 500 to avoid leaking internal details.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction) {
  const requestId = req.headers['x-request-id'] as string | undefined;

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
      },
    });
    return;
  }

  // Log with full error details and request context for debugging
  logger.error({
    err,
    requestId,
    method: req.method,
    url: req.url,
    userId: (req as Request & { userId?: string }).userId,
  }, 'Unhandled error');

  res.status(500).json({
    error: {
      code: ErrorCodes.INTERNAL_ERROR,
      message: 'Internal server error',
      requestId,
    },
  });
}
