import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';

const router = Router();

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  tenantName: z.string().min(1).optional()
});

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

// Sign up - creates tenant and user
router.post('/signup', async (req, res, next) => {
  try {
    const { email, password, name, tenantName } = signUpSchema.parse(req.body);

    // Check if email already exists (globally or per tenant)
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: {
        name: tenantName || `${name}'s Organization`,
        plan: 'FREE',
        status: 'ACTIVE'
      }
    });

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user and profile
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        tenantId: tenant.id,
        profile: {
          create: {
            email,
            name,
            tenantId: tenant.id
          }
        }
      },
      include: {
        profile: true,
        tenant: true
      }
    });

    // Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        profile: user.profile
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// Sign in
router.post('/signin', async (req, res, next) => {
  try {
    const { email, password } = signInSchema.parse(req.body);

    // Find user by email (check all tenants)
    const user = await prisma.user.findFirst({
      where: { email },
      include: {
        profile: true,
        tenant: true
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check tenant status
    if (user.tenant.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Tenant account is not active' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate JWT
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        email: user.email
      },
      secret,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' } as jwt.SignOptions
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        tenantId: user.tenantId,
        profile: user.profile
      },
      token
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        profile: true,
        tenant: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      profile: user.profile,
      tenant: {
        id: user.tenant.id,
        name: user.tenant.name,
        plan: user.tenant.plan,
        status: user.tenant.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// Sign out (client-side token removal, but we can log it)
router.post('/signout', authenticate, (req, res) => {
  res.json({ message: 'Signed out successfully' });
});

export default router;



