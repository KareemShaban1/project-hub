import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);
  console.error('Error stack:', err.stack);
  console.error('Error name:', err.name);
  if ((err as any).code) {
    console.error('Error code:', (err as any).code);
  }

  // Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    if ((err as any).code === 'P2002') {
      return res.status(409).json({ error: 'Duplicate entry' });
    }
    if ((err as any).code === 'P2025') {
      return res.status(404).json({ error: 'Record not found' });
    }
    if ((err as any).code === 'P2021') {
      return res.status(500).json({ 
        error: 'Database table does not exist. Please run: npx prisma db push' 
      });
    }
  }

  // Prisma validation errors
  if (err.name === 'PrismaClientValidationError') {
    console.error('Prisma validation error details:', err.message);
    return res.status(400).json({ 
      error: process.env.NODE_ENV === 'production' 
        ? 'Invalid data provided' 
        : err.message 
    });
  }

  // Database table missing errors
  if (err.message?.includes("doesn't exist") || err.message?.includes('Unknown table')) {
    return res.status(500).json({ 
      error: 'Database tables not found. Please run database migration: npx prisma db push' 
    });
  }

  // Validation errors
  if (err.message.includes('Unauthorized') || err.message.includes('Tenant mismatch')) {
    return res.status(403).json({ error: err.message });
  }

  // Default
  return res.status(500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
}



