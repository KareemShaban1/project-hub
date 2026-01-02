import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware, ensureTenantAccess } from '../middleware/tenant.js';
import { checkProjectAccess, canAdmin } from '../utils/permissions.js';
import { sendInvitationEmail } from '../services/email.js';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

const createInvitationSchema = z.object({
  projectId: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER']).optional()
});

// Create invitation
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const { projectId, email, role } = createInvitationSchema.parse(req.body);

    const project = await prisma.project.findUnique({
      where: { id: projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    ensureTenantAccess(req.user!.tenantId, project.tenantId);

    const { hasAccess, role: userRole } = await checkProjectAccess(
      req.user!.userId,
      project.id,
      req.user!.tenantId
    );

    if (!hasAccess || !canAdmin(userRole)) {
      return res.status(403).json({ error: 'Only owners and admins can invite members' });
    }

    // Check if user already exists in tenant
    const existingUser = await prisma.user.findFirst({
      where: {
        email,
        tenantId: req.user!.tenantId
      },
      include: { profile: true }
    });

    // Check if already a member
    if (existingUser) {
      const existingMember = await prisma.projectMember.findFirst({
        where: {
          projectId,
          userId: existingUser.profile!.id
        }
      });

      if (existingMember) {
        return res.status(409).json({ error: 'User is already a member of this project' });
      }
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        projectId,
        email,
        status: 'PENDING'
      }
    });

    if (existingInvitation) {
      return res.status(409).json({ error: 'Invitation already sent' });
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

    const invitation = await prisma.invitation.create({
      data: {
        tenantId: req.user!.tenantId,
        projectId,
        email,
        role: role || 'MEMBER',
        invitedBy: req.user!.userId,
        expiresAt
      },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    // Send email notification
    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const inviteLink = `${appUrl}/invite/${invitation.token}`;
    
    try {
      await sendInvitationEmail({
        to: email,
        inviterName: invitation.inviter?.name || 'Someone',
        projectName: invitation.project.name,
        role: invitation.role,
        inviteLink: inviteLink,
        expiresIn: '7 days',
      });
    } catch (emailError) {
      // Log but don't fail the invitation creation
      console.error('Email sending failed, but invitation was created:', emailError);
    }

    res.status(201).json(invitation);
  } catch (error) {
    next(error);
  }
});

// Get invitation by token
router.get('/:token', async (req, res, next) => {
  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        token: req.params.token,
        status: 'PENDING'
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            description: true
          }
        },
        inviter: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    res.json(invitation);
  } catch (error) {
    next(error);
  }
});

// Accept invitation
router.post('/:token/accept', authenticate, tenantMiddleware, async (req: AuthRequest, res, next) => {
  try {
    const invitation = await prisma.invitation.findFirst({
      where: {
        token: req.params.token,
        status: 'PENDING'
      }
    });

    if (!invitation) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (new Date() > invitation.expiresAt) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' }
      });
      return res.status(410).json({ error: 'Invitation has expired' });
    }

    // Verify user email matches invitation
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { profile: true }
    });

    if (user?.email !== invitation.email) {
      return res.status(403).json({ error: 'Invitation email does not match your account' });
    }

    // Verify tenant matches
    ensureTenantAccess(req.user!.tenantId, invitation.tenantId);

    // Check if already a member
    const existingMember = await prisma.projectMember.findFirst({
      where: {
        projectId: invitation.projectId,
        userId: user!.profile!.id
      }
    });

    if (existingMember) {
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'ACCEPTED' }
      });
      return res.status(409).json({ error: 'Already a member of this project' });
    }

    // Add as project member
    await prisma.projectMember.create({
      data: {
        tenantId: invitation.tenantId,
        projectId: invitation.projectId,
        userId: user!.profile!.id,
        role: invitation.role
      }
    });

    // Update invitation status
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'ACCEPTED' }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        tenantId: invitation.tenantId,
        projectId: invitation.projectId,
        userId: req.user!.userId,
        action: 'joined',
        entityType: 'project',
        entityId: invitation.projectId
      }
    });

    res.json({ message: 'Invitation accepted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

