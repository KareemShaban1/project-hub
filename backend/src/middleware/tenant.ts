import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

/**
 * Middleware to ensure tenant context is available
 * Must be used after authenticate middleware
 */
export function tenantMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user?.tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }
  next();
}

/**
 * Helper function to ensure resource belongs to user's tenant
 */
export function ensureTenantAccess(
  userTenantId: string,
  resourceTenantId: string
): void {
  if (userTenantId !== resourceTenantId) {
    throw new Error('Unauthorized: Tenant mismatch');
  }
}



