import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import taskRoutes from './routes/tasks.js';
import invitationRoutes from './routes/invitations.js';
import attachmentRoutes from './routes/attachments.js';
import commentRoutes from './routes/comments.js';
import activityRoutes from './routes/activities.js';
import testEmailRoutes from './routes/test-email.js';
import joinRequestRoutes from './routes/join-requests.js';
import notificationRoutes from './routes/notifications.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
// CORS configuration - allow multiple origins in development
const isDevelopment = process.env.NODE_ENV !== 'production';

const corsOptions = isDevelopment
  ? {
      // In development, allow all localhost origins
      origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
          callback(null, true);
        } else {
          callback(null, true); // Still allow in dev for flexibility
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }
  : {
      // In production, use strict origin list
      origin: process.env.CORS_ORIGIN 
        ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
        : ['http://localhost:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    };

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads) - PUBLIC, no auth required
// This allows images/videos to be opened in new tabs without authentication
app.use('/api/files', express.static(path.join(__dirname, '../uploads/tasks'), {
  setHeaders: (res, filePath) => {
    // Set appropriate content type based on file extension
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
    if (contentTypeMap[ext]) {
      res.setHeader('Content-Type', contentTypeMap[ext]);
    }
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
  }
}));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api', attachmentRoutes);
app.use('/api', commentRoutes);
app.use('/api', activityRoutes);
app.use('/api/join-requests', joinRequestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/test-email', testEmailRoutes);

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});

