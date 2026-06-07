import { Request, Response, NextFunction } from 'express';
import { verifyToken, JwtPayload } from '../lib/jwt';

export type AuthenticatedRequest = Request & {
  userId?: string;
  auth?: JwtPayload;
};

export function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

export function getAuthenticatedUser(req: Request, res: Response): string | null {
  const token = getBearerToken(req);
  if (!token) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return null;
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid token' } });
    return null;
  }

  (req as AuthenticatedRequest).userId = decoded.userId;
  (req as AuthenticatedRequest).auth = decoded;
  return decoded.userId;
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const userId = getAuthenticatedUser(req, res);
  if (!userId) return;
  next();
}

export type Role = 'admin' | 'moderator' | 'user' | 'guest';

const ROLE_HIERARCHY: Record<Role, number> = {
  admin: 100,
  moderator: 50,
  user: 10,
  guest: 0
};

export function requireRole(requiredRole: Role) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.auth) {
      return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    }

    const userRole = (authReq.auth.role as Role) || 'user';
    
    if (ROLE_HIERARCHY[userRole] < ROLE_HIERARCHY[requiredRole]) {
      return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Insufficient permissions' } });
    }

    next();
  };
}
