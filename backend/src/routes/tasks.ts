import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware, ensureTenantAccess } from '../middleware/tenant.js';
import { checkProjectAccess, canWrite } from '../utils/permissions.js';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

const createTaskSchema = z.object({
  projectId: z.string().uuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().uuid().optional(),
  dueDate: z.string().datetime().optional(),
  tags: z.array(z.string()).optional()
});

const updateTaskSchema = createTaskSchema.partial().omit({ projectId: true });

// Create task
router.post('/', async (req: AuthRequest, res, next) => {
  try {
    const data = createTaskSchema.parse(req.body);

    // Verify project access
    const project = await prisma.project.findUnique({
      where: { id: data.projectId }
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

    const task = await prisma.task.create({
      data: {
        ...data,
        tenantId: req.user!.tenantId,
        createdBy: req.user!.userId,
        status: data.status || 'TODO',
        priority: data.priority || 'MEDIUM',
        tags: data.tags || [],
        dueDate: data.dueDate ? new Date(data.dueDate) : null
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
        project: {
          select: {
            id: true,
            name: true
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
        action: 'created',
        entityType: 'task',
        entityId: task.id,
        entityName: task.title
      }
    });

    res.status(201).json(task);
  } catch (error) {
    next(error);
  }
});

// Update task
router.put('/:id', async (req: AuthRequest, res, next) => {
  try {
    const data = updateTaskSchema.parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    ensureTenantAccess(req.user!.tenantId, task.tenantId);

    const { hasAccess, role } = await checkProjectAccess(
      req.user!.userId,
      task.projectId,
      req.user!.tenantId
    );

    if (!hasAccess || !canWrite(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const updated = await prisma.task.update({
      where: { id: req.params.id },
      data: {
        ...data,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined
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
        project: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        tenantId: req.user!.tenantId,
        projectId: task.projectId,
        userId: req.user!.userId,
        action: 'updated',
        entityType: 'task',
        entityId: task.id,
        entityName: updated.title
      }
    });

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

// Delete task
router.delete('/:id', async (req: AuthRequest, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: { project: true }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    ensureTenantAccess(req.user!.tenantId, task.tenantId);

    const { hasAccess, role } = await checkProjectAccess(
      req.user!.userId,
      task.projectId,
      req.user!.tenantId
    );

    if (!hasAccess || !canWrite(role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await prisma.task.delete({
      where: { id: req.params.id }
    });

    // Log activity
    await prisma.activityLog.create({
      data: {
        tenantId: req.user!.tenantId,
        projectId: task.projectId,
        userId: req.user!.userId,
        action: 'deleted',
        entityType: 'task',
        entityId: task.id,
        entityName: task.title
      }
    });

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get task details
router.get('/:id', async (req: AuthRequest, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
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
        project: {
          select: {
            id: true,
            name: true
          }
        },
        comments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatarUrl: true
              }
            }
          },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    ensureTenantAccess(req.user!.tenantId, task.tenantId);

    res.json(task);
  } catch (error) {
    next(error);
  }
});

export default router;



