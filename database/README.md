# Database Migration Guide: Supabase to MySQL

This guide will help you migrate your Project Manager application from Supabase to a self-hosted MySQL database for SaaS deployment.

## 🎯 Recommended Database: **MySQL 8.0+**

### Why MySQL for SaaS?

✅ **Self-hosted** - Full control over your data  
✅ **phpMyAdmin support** - Easy database management  
✅ **Proven scalability** - Used by major SaaS platforms  
✅ **Cost-effective** - No per-user pricing  
✅ **Multi-tenancy ready** - Row-level isolation built-in  
✅ **JSON support** - For flexible data structures  
✅ **Strong ecosystem** - Extensive tooling and community  

### Architecture: Multi-Tenant SaaS

This schema uses **row-level multi-tenancy** where each table includes a `tenant_id` column. This approach:
- Isolates data per tenant
- Scales efficiently
- Allows shared infrastructure
- Simplifies backups and maintenance

---

## 📋 Prerequisites

1. **MySQL 8.0+** installed and running
2. **phpMyAdmin** (optional but recommended)
3. **Node.js** with Prisma CLI
4. **Backend API** (Express.js, Next.js API routes, or similar)

---

## 🚀 Setup Instructions

### Step 1: Create Database

```sql
CREATE DATABASE project_manager_saas 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;
```

### Step 2: Import Schema

**Option A: Using phpMyAdmin**
1. Open phpMyAdmin
2. Select your database
3. Go to "Import" tab
4. Upload `mysql-schema.sql`
5. Click "Go"

**Option B: Using MySQL CLI**
```bash
mysql -u root -p project_manager_saas < database/mysql-schema.sql
```

### Step 3: Install Prisma

```bash
npm install prisma @prisma/client
npm install -D prisma
```

### Step 4: Configure Environment Variables

Create `.env` file:
```env
DATABASE_URL="mysql://username:password@localhost:3306/project_manager_saas"
JWT_SECRET="your-super-secret-jwt-key-change-this"
NODE_ENV="production"
```

### Step 5: Initialize Prisma

```bash
npx prisma generate
npx prisma db push  # Or use migrations
```

---

## 🔐 Authentication Strategy

Since you're moving away from Supabase Auth, you'll need to implement authentication. Recommended options:

### Option 1: JWT with bcrypt (Recommended for self-hosted)

**Backend (Node.js/Express example):**
```javascript
// Install: npm install jsonwebtoken bcryptjs
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sign up
async function signUp(email, password, name, tenantId) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      tenantId,
      profile: {
        create: {
          email,
          name,
          tenantId
        }
      }
    }
  });
  return user;
}

// Sign in
async function signIn(email, password, tenantId) {
  const user = await prisma.user.findUnique({
    where: { email_tenantId: { email, tenantId } },
    include: { profile: true }
  });
  
  if (!user || !await bcrypt.compare(password, user.passwordHash)) {
    throw new Error('Invalid credentials');
  }
  
  const token = jwt.sign(
    { userId: user.id, tenantId: user.tenantId },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  
  return { user, token };
}
```

### Option 2: NextAuth.js (If using Next.js)

```bash
npm install next-auth
```

### Option 3: Passport.js (More features)

```bash
npm install passport passport-local passport-jwt
```

---

## 🔄 Data Migration from Supabase

If you have existing data in Supabase:

1. **Export from Supabase:**
   ```sql
   -- In Supabase SQL Editor
   COPY (SELECT * FROM profiles) TO '/tmp/profiles.csv' CSV HEADER;
   -- Repeat for each table
   ```

2. **Transform UUIDs and add tenant_id:**
   ```javascript
   // migration-script.js
   import { PrismaClient } from '@prisma/client';
   import fs from 'fs';
   import csv from 'csv-parser';
   
   const prisma = new PrismaClient();
   
   // Read CSV and import with tenant_id
   // You'll need to assign tenant_id based on your business logic
   ```

3. **Import to MySQL:**
   ```sql
   LOAD DATA INFILE '/path/to/profiles.csv'
   INTO TABLE profiles
   FIELDS TERMINATED BY ','
   ENCLOSED BY '"'
   LINES TERMINATED BY '\n'
   IGNORE 1 ROWS;
   ```

---

## 🏗️ Backend API Structure

Create a backend API to replace Supabase client calls:

```
backend/
├── src/
│   ├── routes/
│   │   ├── auth.ts          # Authentication endpoints
│   │   ├── projects.ts      # Project CRUD
│   │   ├── tasks.ts         # Task CRUD
│   │   └── invitations.ts   # Invitation management
│   ├── middleware/
│   │   ├── auth.ts          # JWT verification
│   │   └── tenant.ts        # Tenant isolation
│   ├── services/
│   │   ├── db.ts            # Prisma client
│   │   └── permissions.ts   # Authorization logic
│   └── utils/
│       └── errors.ts        # Error handling
```

**Example API Route:**
```typescript
// src/routes/projects.ts
import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { prisma } from '../services/db';

const router = Router();

router.get('/', authenticate, async (req, res) => {
  const { tenantId, userId } = req.user;
  
  const projects = await prisma.project.findMany({
    where: { tenantId },
    include: {
      members: { include: { user: { include: { profile: true } } } },
      tasks: true
    }
  });
  
  res.json(projects);
});

export default router;
```

---

## 🔒 Security Considerations

### 1. Tenant Isolation
Always filter by `tenant_id` in queries:
```typescript
// ✅ Good
await prisma.project.findMany({
  where: { tenantId: req.user.tenantId }
});

// ❌ Bad - no tenant filter
await prisma.project.findMany();
```

### 2. Row-Level Security Replacement
Replace Supabase RLS with application-level checks:
```typescript
async function canAccessProject(userId: string, projectId: string) {
  const member = await prisma.projectMember.findFirst({
    where: {
      userId,
      projectId
    }
  });
  return !!member;
}
```

### 3. SQL Injection Prevention
Use Prisma (parameterized queries) - never raw SQL with user input.

---

## 📊 Real-time Updates

Replace Supabase real-time with:

### Option 1: WebSockets (Socket.io)
```bash
npm install socket.io
```

```typescript
import { Server } from 'socket.io';

io.on('connection', (socket) => {
  socket.join(`tenant:${socket.user.tenantId}`);
  
  socket.on('subscribe:project', (projectId) => {
    socket.join(`project:${projectId}`);
  });
});

// Broadcast on changes
io.to(`project:${projectId}`).emit('project:updated', data);
```

### Option 2: Server-Sent Events (SSE)
Simpler, one-way communication.

### Option 3: Polling
Simple but less efficient - good for MVP.

---

## 🧪 Testing

1. **Create test tenant:**
```sql
INSERT INTO tenants (id, name, subdomain, plan) 
VALUES (UUID(), 'Test Company', 'test', 'professional');
```

2. **Create test user:**
```sql
-- Use your signup API endpoint or:
INSERT INTO users (id, tenant_id, email, password_hash)
VALUES (UUID(), 'tenant-id', 'test@example.com', '$2b$10$...');
```

---

## 📈 Performance Optimization

1. **Indexes** - Already included in schema
2. **Connection Pooling** - Prisma handles this
3. **Query Optimization** - Use `select` to limit fields
4. **Caching** - Add Redis for frequently accessed data

---

## 🚨 Important Notes

1. **UUID vs Auto-increment**: Using UUIDs for better multi-tenant isolation
2. **JSON for tags**: MySQL 8.0+ supports JSON natively
3. **Soft deletes**: Consider adding `deleted_at` columns if needed
4. **Backups**: Set up regular MySQL backups
5. **Monitoring**: Use tools like PM2, New Relic, or DataDog

---

## 📚 Next Steps

1. ✅ Set up MySQL database
2. ✅ Import schema
3. ✅ Install Prisma
4. ⏭️ Create backend API
5. ⏭️ Implement authentication
6. ⏭️ Replace Supabase client calls
7. ⏭️ Set up real-time updates
8. ⏭️ Deploy and test

---

## 🆘 Troubleshooting

**Issue: UUID() function not working**
- MySQL 8.0+ required, or use application-generated UUIDs

**Issue: JSON column errors**
- Ensure MySQL 8.0+ and utf8mb4 charset

**Issue: Foreign key constraints**
- Check that referenced records exist
- Verify tenant_id matches across related records

---

## 📞 Support

For questions or issues, refer to:
- [Prisma Documentation](https://www.prisma.io/docs)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [phpMyAdmin Documentation](https://www.phpmyadmin.net/docs/)


