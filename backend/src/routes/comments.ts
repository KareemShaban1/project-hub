import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware, ensureTenantAccess } from '../middleware/tenant.js';
import { checkProjectAccess, canWrite } from '../utils/permissions.js';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

const createCommentSchema = z.object({
  taskId: z.string().uuid(),
  content: z.string().min(1)
});

// Get task comments
router.get('/tasks/:taskId/comments', async (req: AuthRequest, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    ensureTenantAccess(req.user!.tenantId, task.tenantId);

    const comments = await prisma.taskComment.findMany({
      where: {
        taskId: req.params.taskId,
        tenantId: req.user!.tenantId
      },
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
    });

    res.json(comments);
  } catch (error) {
    next(error);
  }
});

// Create comment
router.post('/tasks/:taskId/comments', async (req: AuthRequest, res, next) => {
  try {
    const { content } = z.object({ content: z.string().min(1) }).parse(req.body);

    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
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

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { id: req.user!.userId }
    });

    if (!profile) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const comment = await prisma.taskComment.create({
      data: {
        tenantId: req.user!.tenantId,
        taskId: req.params.taskId,
        userId: req.user!.userId,
        content: content.trim()
      },
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
    });

    res.status(201).json(comment);
  } catch (error) {
    next(error);
  }
});

// Delete comment
router.delete('/comments/:id', async (req: AuthRequest, res, next) => {
  try {
    const comment = await prisma.taskComment.findUnique({
      where: { id: req.params.id },
      include: { task: { include: { project: true } } }
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    ensureTenantAccess(req.user!.tenantId, comment.tenantId);

    // Check if user owns the comment or has project access
    const { hasAccess, role } = await checkProjectAccess(
      req.user!.userId,
      comment.task.projectId,
      req.user!.tenantId
    );

    if (!hasAccess || (!canWrite(role) && comment.userId !== req.user!.userId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    await prisma.taskComment.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;



