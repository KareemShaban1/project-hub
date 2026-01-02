import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { prisma } from '../services/db.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { tenantMiddleware, ensureTenantAccess } from '../middleware/tenant.js';
import { checkProjectAccess, canWrite } from '../utils/permissions.js';

const router = Router();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'tasks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// File serving route - PUBLIC (no auth required)
// This allows images/videos to be opened in new tabs without authentication
// Handles both /api/attachments/files/... and /api/files/... paths
router.get('/attachments/files/:filename', (req, res, next) => {
  try {
    const filePath = path.join(uploadDir, req.params.filename);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Set appropriate headers for file serving
    const ext = path.extname(filePath).toLowerCase();
    const contentTypeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
      '.mkv': 'video/x-matroska',
    };

    const contentType = contentTypeMap[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    res.sendFile(filePath);
  } catch (error) {
    next(error);
  }
});

// All other routes require authentication
router.use(authenticate);
router.use(tenantMiddleware);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow images and videos
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|mov|avi|webm|mkv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images and videos are allowed'));
    }
  }
});

// Get task attachments
router.get('/tasks/:taskId/attachments', async (req: AuthRequest, res, next) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId }
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    ensureTenantAccess(req.user!.tenantId, task.tenantId);

    const attachments = await prisma.taskAttachment.findMany({
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
      orderBy: { createdAt: 'desc' }
    });

    res.json(attachments);
  } catch (error) {
    next(error);
  }
});

// Upload attachment
router.post('/tasks/:taskId/attachments', upload.single('file'), async (req: AuthRequest, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const task = await prisma.task.findUnique({
      where: { id: req.params.taskId },
      include: { project: true }
    });

    if (!task) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Task not found' });
    }

    ensureTenantAccess(req.user!.tenantId, task.tenantId);

    const { hasAccess, role } = await checkProjectAccess(
      req.user!.userId,
      task.projectId,
      req.user!.tenantId
    );

    if (!hasAccess || !canWrite(role)) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Get user profile
    const profile = await prisma.profile.findUnique({
      where: { id: req.user!.userId }
    });

    if (!profile) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'User profile not found' });
    }

    // Create file URL (in production, use CDN or object storage)
    // Use /api/files path which is served by static middleware (public, no auth)
    const fileUrl = `/api/files/${req.file.filename}`;

    const attachment = await prisma.taskAttachment.create({
      data: {
        tenantId: req.user!.tenantId,
        taskId: req.params.taskId,
        userId: req.user!.userId,
        fileName: req.file.originalname,
        filePath: fileUrl,
        fileSize: req.file.size,
        fileType: req.file.mimetype
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

    res.status(201).json(attachment);
  } catch (error) {
    if (req.file) {
      fs.unlinkSync(req.file.path);
    }
    next(error);
  }
});


// Delete attachment
router.delete('/attachments/:id', async (req: AuthRequest, res, next) => {
  try {
    const attachment = await prisma.taskAttachment.findUnique({
      where: { id: req.params.id },
      include: { task: true }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    ensureTenantAccess(req.user!.tenantId, attachment.tenantId);

    // Check if user owns the attachment or has project access
    const { hasAccess, role } = await checkProjectAccess(
      req.user!.userId,
      attachment.task.projectId,
      req.user!.tenantId
    );

    if (!hasAccess || (!canWrite(role) && attachment.userId !== req.user!.userId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    // Delete file from filesystem
    // Extract filename from path (could be /api/files/filename or /api/attachments/files/filename)
    const filename = attachment.filePath.split('/').pop() || '';
    const filePath = path.join(uploadDir, filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    // Delete database record
    await prisma.taskAttachment.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;

