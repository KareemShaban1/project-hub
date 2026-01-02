import { Router } from 'express';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware, ensureTenantAccess } from '../middleware/tenant.js';

const router = Router();

router.use(authenticate);
router.use(tenantMiddleware);

// Get project activities
router.get('/projects/:projectId/activities', async (req: AuthRequest, res, next) => {
  try {
    const project = await prisma.project.findUnique({
      where: { id: req.params.projectId }
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    ensureTenantAccess(req.user!.tenantId, project.tenantId);

    const activities = await prisma.activityLog.findMany({
      where: {
        projectId: req.params.projectId,
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
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    res.json(activities);
  } catch (error) {
    next(error);
  }
});

export default router;



