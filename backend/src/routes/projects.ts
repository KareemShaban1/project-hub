import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware, ensureTenantAccess } from '../middleware/tenant.js';
import { checkProjectAccess, canWrite, canAdmin } from '../utils/permissions.js';
import { errorHandler } from '../middleware/errorHandler.js';

const router = Router();

// All routes require authentication and tenant context
router.use(authenticate);
router.use(tenantMiddleware);

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
  status: z.enum(['ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional()
});

const updateProjectSchema = createProjectSchema.partial();

// List all projects for tenant where user is a member or creator
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    // Profile.id is the same as User.id, so we can use req.user!.userId directly
    // Find all project IDs where user is a member
    // Note: Don't filter by tenantId here - memberships use the project's tenantId,
    // not the user's tenantId. We'll filter projects by tenant later.
    const userMemberships = await prisma.projectMember.findMany({
      where: {
        userId: req.user!.userId, // This is Profile.id (same as User.id)
      },
      select: {
        projectId: true
      }
    });
    
    const memberProjectIds = userMemberships.map(m => m.projectId);
    
    // Also find projects where user is the creator (in user's tenant)
    const createdProjects = await prisma.project.findMany({
      where: {
        createdBy: req.user!.userId, // This is Profile.id (same as User.id)
        tenantId: req.user!.tenantId
      },
      select: {
        id: true
      }
    });
    
    const createdProjectIds = createdProjects.map(p => p.id);
    
    // Combine both sets of project IDs
    const accessibleProjectIds = [...new Set([...memberProjectIds, ...createdProjectIds])];
    
    console.log(`[Projects] User ${req.user!.userId} - Member projects: ${memberProjectIds.length}, Created projects: ${createdProjectIds.length}, Total accessible: ${accessibleProjectIds.length}`);
    
    // If no accessible projects, return empty array
    if (accessibleProjectIds.length === 0) {
      return res.json([]);
    }
    
    // Fetch projects where user is a member or creator
    // For memberships: include projects where user is a member (membership tenantId = project tenantId)
    // For created: include projects in user's tenant
    const projects = await prisma.project.findMany({
      where: { 
        id: { in: accessibleProjectIds },
        // Project must be in user's tenant OR user must be a member
        OR: [
          { tenantId: req.user!.tenantId },
          {
            id: { in: memberProjectIds },
            members: {
              some: {
                userId: req.user!.userId
              }
            }
          }
        ]
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        invitations: {
          include: {
            inviter: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            },
            project: {
              select: {
                id: true,
                name: true,
                description: true
              }
            }
          }
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(projects);
  } catch (error) {
    next(error);
  }
});

// Get single project
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        },
        tasks: {
          include: {
            assignee: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            },
            creator: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check if user is a member or creator first
    // This allows users who were added via join request to access the project
    const isCreator = project.createdBy === req.user!.userId;
    const isMember = project.members.some(m => m.userId === req.user!.userId);

    if (isCreator || isMember) {
      // User is a member or creator, allow access
      // Note: In a multi-tenant system, members should be in the same tenant as the project
      // But we check membership first to allow access even if there's a tenant mismatch
      // (which shouldn't happen in normal operation)
      res.json(project);
      return;
    }

    // If not a member or creator, deny access
    return res.status(403).json({ error: 'You do not have access to this project' });
  } catch (error) {
    next(error);
  }
});

// Generate unique project code
async function generateProjectCode(): Promise<string> {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code: string;
  let exists = true;
  
  while (exists) {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    const existing = await prisma.project.findUnique({
      where: { code }
    });
    exists = !!existing;
  }
  
  return code!;
}

// Create project
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createProjectSchema.parse(req.body);

    const code = await generateProjectCode();

    const project = await prisma.project.create({
      data: {
        ...data,
        code,
        tenantId: req.user!.tenantId,
        createdBy: req.user!.userId,
        status: data.status || 'ACTIVE',
        color: data.color || '#14b8a6'
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        members: true
      }
    });

    // Add creator as owner
    await prisma.projectMember.create({
      data: {
        tenantId: req.user!.tenantId,
        projectId: project.id,
        userId: req.user!.userId,
        role: 'OWNER'
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        tenantId: req.user!.tenantId,
        projectId: project.id,
        userId: req.user!.userId,
        action: 'created',
        entityType: 'project',
        entityId: project.id,
        entityName: project.name
      }
    });

    const projectWithMembers = await prisma.project.findUnique({
      where: { id: project.id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    res.status(201).json(projectWithMembers);
  } catch (error) {
    next(error);
  }
});

// Update project
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = updateProjectSchema.parse(req.body);
    
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    ensureTenantAccess(req.user!.tenantId, project.tenantId);

    const { hasAccess, role } = await checkProjectAccess(
      req.user!.userId,
      project.id,
      req.user!.tenantId
    );

    if (!hasAccess || !canWrite(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.project.update({
      where: { id: req.params.id },
      data,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        tenantId: req.user!.tenantId,
        projectId: project.id,
        userId: req.user!.userId,
        action: 'updated',
        entityType: 'project',
        entityId: project.id,
        entityName: updated.name
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    ensureTenantAccess(req.user!.tenantId, project.tenantId);

    const { hasAccess, role } = await checkProjectAccess(
      req.user!.userId,
      project.id,
      req.user!.tenantId
    );

    if (!hasAccess || !canAdmin(role)) {
      return res.status(403).json({ error: 'Only owners and admins can delete projects' });
    }

    await prisma.project.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get project tasks
router.get('/:id/tasks', async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    ensureTenantAccess(req.user!.tenantId, project.tenantId);

    const tasks = await prisma.task.findMany({
      where: {
        projectId: req.params.id,
        tenantId: req.user!.tenantId
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatarUrl: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(tasks);
  } catch (error) {
    next(error);
  }
});

export default router;

