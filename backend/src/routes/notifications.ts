import { Router } from 'express';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { errorHandler } from '../middleware/errorHandler.js';

const router = Router();

// All routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

// Get all notifications for current user
router.get('/', async (req: AuthRequest, res, next) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: {
        userId: req.user!.userId,
        tenantId: req.user!.tenantId
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            color: true,
          }
        },
        joinRequest: {
          select: {
            id: true,
            status: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// Get unread notifications count
router.get('/unread-count', async (req: AuthRequest, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        read: false
      }
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;

    const notification = await prisma.notification.findUnique({
      where: { id }
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    if (notification.userId !== req.user!.userId) {
      return res.status(403).json({ error: 'You can only mark your own notifications as read' });
    }

    await prisma.notification.update({
      where: { id },
      data: { read: true }
    });

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', async (req: AuthRequest, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: {
        userId: req.user!.userId,
        tenantId: req.user!.tenantId,
        read: false
      },
      data: { read: true }
    });

    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

router.use(errorHandler);

export default router;

