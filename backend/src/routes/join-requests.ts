import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { errorHandler } from '../middleware/errorHandler.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

const createJoinRequestSchema = z.object({
  projectCode: z.string().min(1),
  message: z.string().optional(),
});

// Search project by code (public search, but requires auth)
router.get('/search/:code', async (req: AuthRequest, res, next) => {
  try {
    const { code } = req.params;
    
    const project = await prisma.project.findUnique({
      where: { code: code.toUpperCase() },
      select: {
        id: true,
        name: true,
        description: true,
        code: true,
        status: true,
        color: true,
        createdAt: true,
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        members: {
          select: {
            userId: true,
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is already a member
    const isMember = project.members.some(m => m.userId === req.user!.userId);
    
    // Check if user already has a pending request
    const existingRequest = await prisma.joinRequest.findFirst({
      where: {
        projectId: project.id,
        userId: req.user!.userId,
        status: 'PENDING'
      }
    });

    res.json({
      ...project,
      isMember,
      hasPendingRequest: !!existingRequest
    });
  } catch (error) {
    next(error);
  }
});

// Create join request
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { projectCode, message } = createJoinRequestSchema.parse(req.body);
    
    // Find project by code
    let project;
    try {
      project = await prisma.project.findUnique({
        where: { code: projectCode.toUpperCase() },
        include: {
          members: true,
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
            }
          },
        }
      });
    } catch (dbError: any) {
      console.error('Error finding project by code:', dbError);
      if (dbError.message?.includes("doesn't exist") || dbError.code === 'P2021') {
        return res.status(500).json({ 
          error: 'Database tables may not exist. Please restart the backend server after running: npx prisma db push' 
        });
      }
      throw dbError;
    }

    if (!project) {
      return res.status(404).json({ error: 'Project not found with this code' });
    }

    if (!project.code) {
      return res.status(400).json({ error: 'This project does not have a code assigned. Please contact the project owner.' });
    }

    // In a multi-tenant system, users should only be able to join projects in their own tenant
    // This ensures proper tenant isolation
    if (project.tenantId !== req.user!.tenantId) {
      return res.status(403).json({ error: 'You can only join projects within your organization' });
    }

    // Check if user is already a member
    const isMember = project.members.some(m => m.userId === req.user!.userId);
    if (isMember) {
      return res.status(400).json({ error: 'You are already a member of this project' });
    }

    // Check if there's already a pending request
    let existingRequest;
    try {
      existingRequest = await prisma.joinRequest.findFirst({
        where: {
          projectId: project.id,
          userId: req.user!.userId,
          status: 'PENDING'
        }
      });
    } catch (dbError: any) {
      console.error('Error checking existing request:', dbError);
      // If table doesn't exist, continue (will fail on create)
      if (dbError.message?.includes("doesn't exist") || dbError.code === 'P2021') {
        console.error('Join requests table may not exist. Please run: npx prisma db push');
      }
    }

    if (existingRequest) {
      return res.status(400).json({ error: 'You already have a pending request for this project' });
    }

    // Create join request
    const joinRequest = await prisma.joinRequest.create({
      data: {
        tenantId: req.user!.tenantId,
        projectId: project.id,
        userId: req.user!.userId,
        message: message || null,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          }
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        }
      }
    });

    // Create notification for project owner
    // Find owner from members or use creator
    let ownerId: string | null = null;
    const ownerMember = project.members.find(m => m.role === 'OWNER');
    if (ownerMember) {
      ownerId = ownerMember.userId;
    } else if (project.creator) {
      ownerId = project.creator.id;
    }
    
    if (ownerId) {
      try {
        await prisma.notification.create({
          data: {
            tenantId: req.user!.tenantId,
            userId: ownerId,
            type: 'JOIN_REQUEST',
            title: 'New Join Request',
            message: `${req.user!.name || req.user!.email} wants to join project "${project.name}"`,
            projectId: project.id,
            joinRequestId: joinRequest.id,
            read: false
          }
        });
      } catch (notifError) {
        // Log error but don't fail the request if notification creation fails
        console.error('Failed to create notification:', notifError);
      }
    }

    res.status(201).json(joinRequest);
  } catch (error: any) {
    console.error('Error creating join request:', error);
    // Check if it's a database table missing error
    if (error.message?.includes("doesn't exist") || error.code === 'P2021') {
      console.error('Database tables may not exist. Please run: npx prisma db push');
      return res.status(500).json({ 
        error: 'Database tables not found. Please run database migration: npx prisma db push' 
      });
    }
    // Check if it's a Prisma validation error
    if (error.name === 'PrismaClientValidationError') {
      console.error('Prisma validation error:', error.message);
      return res.status(400).json({ error: 'Invalid data provided' });
    }
    next(error);
  }
});

// Get join requests for projects I own/admin
router.get('/project/:projectId', async (req: AuthRequest, res, next) => {
  try {
    const { projectId } = req.params;

    // Check if user is owner or admin
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You do not have permission to view join requests for this project' });
    }

    const requests = await prisma.joinRequest.findMany({
      where: {
        projectId,
        status: 'PENDING'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json(requests);
  } catch (error) {
    next(error);
  }
});

// Accept join request
router.post('/:requestId/accept', async (req: AuthRequest, res, next) => {
  try {
    const { requestId } = req.params;

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: {
        project: {
          include: {
            members: true
          }
        }
      }
    });

    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Check if user is owner or admin
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: joinRequest.projectId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You do not have permission to accept join requests' });
    }

    // Check if already a member
    const isMember = joinRequest.project.members.some(m => m.userId === joinRequest.userId);
    if (isMember) {
      return res.status(400).json({ error: 'User is already a member' });
    }

    // Update join request status
    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'ACCEPTED' }
    });

    // Add user as member
    // Note: joinRequest.userId is Profile.id (same as User.id)
    // IMPORTANT: Since we enforce same-tenant joins, use the requester's tenantId (joinRequest.tenantId)
    // which should match the project's tenantId. This ensures the membership record matches the user's tenant.
    const newMember = await prisma.projectMember.create({
      data: {
        tenantId: joinRequest.tenantId, // Use requester's tenant (should match project's tenant)
        projectId: joinRequest.projectId,
        userId: joinRequest.userId, // This is Profile.id
        role: 'MEMBER'
      }
    });
    
    console.log(`[Join Request] Added user ${joinRequest.userId} as MEMBER to project ${joinRequest.projectId} (member tenant: ${joinRequest.tenantId}, project tenant: ${joinRequest.project.tenantId})`);

    // Create notification for requester
    await prisma.notification.create({
      data: {
        tenantId: joinRequest.tenantId,
        userId: joinRequest.userId,
        type: 'PROJECT_UPDATE',
        title: 'Join Request Accepted',
        message: `Your request to join "${joinRequest.project.name}" has been accepted`,
        projectId: joinRequest.projectId,
        read: false
      }
    });

    res.json({ message: 'Join request accepted' });
  } catch (error) {
    next(error);
  }
});

// Decline join request
router.post('/:requestId/decline', async (req: AuthRequest, res, next) => {
  try {
    const { requestId } = req.params;

    const joinRequest = await prisma.joinRequest.findUnique({
      where: { id: requestId },
      include: {
        project: true
      }
    });

    if (!joinRequest) {
      return res.status(404).json({ error: 'Join request not found' });
    }

    // Check if user is owner or admin
    const membership = await prisma.projectMember.findFirst({
      where: {
        projectId: joinRequest.projectId,
        userId: req.user!.userId,
        role: { in: ['OWNER', 'ADMIN'] }
      }
    });

    if (!membership) {
      return res.status(403).json({ error: 'You do not have permission to decline join requests' });
    }

    // Update join request status
    await prisma.joinRequest.update({
      where: { id: requestId },
      data: { status: 'DECLINED' }
    });

    // Create notification for requester
    await prisma.notification.create({
      data: {
        tenantId: joinRequest.tenantId,
        userId: joinRequest.userId,
        type: 'PROJECT_UPDATE',
        title: 'Join Request Declined',
        message: `Your request to join "${joinRequest.project.name}" has been declined`,
        projectId: joinRequest.projectId,
        read: false
      }
    });

    res.json({ message: 'Join request declined' });
  } catch (error) {
    next(error);
  }
});

router.use(errorHandler);

export default router;

