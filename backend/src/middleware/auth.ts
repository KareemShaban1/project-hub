import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../services/db.js';

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    email: string;
  };
}

export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error('JWT_SECRET not configured');
    }

    const decoded = jwt.verify(token, secret) as {
      userId: string;
      tenantId: string;
      email: string;
    };

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: {
        tenant: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (user.tenant.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Tenant account is not active' });
    }

    req.user = {
      userId: decoded.userId,
      tenantId: decoded.tenantId,
      email: decoded.email
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
}



