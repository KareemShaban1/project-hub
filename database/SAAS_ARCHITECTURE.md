# SaaS Architecture Guide

## Multi-Tenancy Strategy

This project uses **Row-Level Multi-Tenancy** where every table includes a `tenant_id` column to isolate data between different organizations/tenants.

### Benefits:
- ✅ Single database instance
- ✅ Easier backups and maintenance
- ✅ Cost-effective scaling
- ✅ Simple to implement
- ✅ Works well with MySQL

### How It Works:

```
┌─────────────────────────────────────┐
│         Application Layer          │
│  (Extracts tenant_id from JWT)     │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│         API Middleware              │
│  - Authenticates user               │
│  - Extracts tenant_id               │
│  - Adds to all queries              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│      Database Layer (MySQL)         │
│  - All tables have tenant_id        │
│  - Indexed for performance          │
│  - Foreign keys maintain isolation  │
└─────────────────────────────────────┘
```

## Tenant Isolation Rules

### 1. Always Filter by tenant_id
```typescript
// ✅ CORRECT
const projects = await prisma.project.findMany({
  where: { tenantId: user.tenantId }
});

// ❌ WRONG - Data Leakage Risk!
const projects = await prisma.project.findMany();
```

### 2. Validate Tenant Access
```typescript
async function ensureTenantAccess(
  userId: string, 
  tenantId: string, 
  resourceTenantId: string
) {
  if (tenantId !== resourceTenantId) {
    throw new Error('Unauthorized: Tenant mismatch');
  }
}
```

### 3. Use Middleware
```typescript
// middleware/tenant.ts
export function tenantMiddleware(req, res, next) {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    return res.status(401).json({ error: 'No tenant context' });
  }
  req.tenantId = tenantId;
  next();
}
```

## Database Schema Design

### Core Tables:
1. **tenants** - Organization/company information
2. **users** - Authentication (one per tenant)
3. **profiles** - User profile data
4. **projects** - Projects (scoped to tenant)
5. **project_members** - Team memberships
6. **tasks** - Tasks within projects
7. **invitations** - Project invitations

### Key Design Decisions:

1. **UUIDs instead of auto-increment IDs**
   - Prevents ID enumeration attacks
   - Better for distributed systems
   - Easier data merging if needed

2. **JSON for flexible data**
   - `tags` in tasks table
   - `details` in activity_log
   - MySQL 8.0+ has excellent JSON support

3. **Cascading Deletes**
   - When tenant is deleted, all related data is removed
   - Maintains data integrity
   - Simplifies cleanup

4. **Indexes for Performance**
   - All `tenant_id` columns indexed
   - Composite indexes for common queries
   - Foreign key indexes

## Authentication Flow

```
1. User signs up/in
   ↓
2. Backend validates credentials
   ↓
3. JWT token generated with:
   - userId
   - tenantId
   - email
   ↓
4. Token sent to frontend
   ↓
5. Frontend stores token
   ↓
6. All API requests include token
   ↓
7. Backend verifies token & extracts tenantId
   ↓
8. All queries filtered by tenantId
```

## API Endpoint Structure

```
POST   /api/auth/signup          - Create account
POST   /api/auth/signin           - Login
POST   /api/auth/signout          - Logout
GET    /api/auth/me               - Get current user

GET    /api/projects              - List projects (tenant-scoped)
POST   /api/projects              - Create project
GET    /api/projects/:id         - Get project
PUT    /api/projects/:id         - Update project
DELETE /api/projects/:id         - Delete project

GET    /api/projects/:id/tasks    - List tasks
POST   /api/projects/:id/tasks    - Create task
PUT    /api/tasks/:id            - Update task
DELETE /api/tasks/:id            - Delete task

POST   /api/projects/:id/invite   - Invite member
GET    /api/invitations/:token   - Get invitation
POST   /api/invitations/:token/accept - Accept invitation
```

## Security Best Practices

### 1. Tenant Isolation
- Never trust client-provided tenant_id
- Always extract from authenticated user's token
- Validate tenant_id matches user's tenant

### 2. Authorization
- Check project membership before operations
- Verify user role (owner/admin/member/viewer)
- Use helper functions for permission checks

### 3. Data Validation
- Validate all inputs
- Use Prisma for type safety
- Sanitize user inputs

### 4. Rate Limiting
- Implement per-tenant rate limits
- Prevent abuse
- Use Redis for rate limiting

## Scaling Considerations

### Current Design Supports:
- ✅ 100s of tenants
- ✅ 1000s of users per tenant
- ✅ 10,000s of projects
- ✅ 100,000s of tasks

### For Larger Scale:
1. **Database Sharding**
   - Shard by tenant_id
   - Route queries to appropriate shard

2. **Read Replicas**
   - Separate read/write operations
   - Distribute load

3. **Caching Layer**
   - Redis for frequently accessed data
   - Cache tenant settings
   - Cache user permissions

4. **CDN for Assets**
   - Serve static files
   - Task attachments
   - User avatars

## Monitoring & Observability

### Key Metrics to Track:
1. **Per-tenant metrics:**
   - Active users
   - API request count
   - Storage usage
   - Feature usage

2. **Database metrics:**
   - Query performance
   - Connection pool usage
   - Slow queries
   - Index usage

3. **Application metrics:**
   - Response times
   - Error rates
   - Authentication failures
   - API endpoint usage

## Backup Strategy

### Recommended Approach:
1. **Daily full backups** - Entire database
2. **Hourly incremental** - Changed data only
3. **Point-in-time recovery** - MySQL binlog
4. **Off-site storage** - Cloud storage (S3, etc.)
5. **Test restores** - Monthly verification

### Backup Script Example:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
mysqldump -u root -p project_manager_saas > backup_$DATE.sql
gzip backup_$DATE.sql
aws s3 cp backup_$DATE.sql.gz s3://your-backup-bucket/
```

## Deployment Checklist

- [x] MySQL 8.0+ installed and configured
- [x] Database schema imported
- [x] Environment variables set
- [x] Prisma client generated
- [x] Authentication implemented
- [x] API endpoints created
- [ ] Frontend updated to use API (Partially complete - AuthContext updated, ProjectContext needs update)
- [ ] Real-time updates configured
- [ ] File upload handling set up
- [ ] Email service configured
- [ ] Monitoring set up
- [ ] Backups configured
- [ ] SSL/TLS certificates installed
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Performance testing completed

## Migration Status

### ✅ Completed
- Backend API server structure (Express.js)
- JWT authentication middleware and tenant isolation
- API routes (auth, projects, tasks, invitations)
- API client utilities for frontend
- AuthContext updated to use new API
- Auth page updated with tenant name support

### 🔄 In Progress
- ProjectContext migration from Supabase to new API
- Frontend components migration

### 📋 Next Steps
1. Update ProjectContext to use apiClient instead of Supabase
2. Update all components that use Supabase directly
3. Remove Supabase dependencies (optional)
4. Add real-time updates (WebSocket or polling)
5. Implement file upload handling
6. Configure email service for invitations

## Cost Estimation

### Self-Hosted MySQL SaaS:
- **Server**: $20-100/month (VPS/Cloud)
- **Domain**: $10-15/year
- **Email Service**: $0-20/month (SendGrid, etc.)
- **Storage**: $5-50/month (S3, etc.)
- **Monitoring**: $0-30/month (free tier available)

**Total: ~$35-200/month** (vs Supabase's per-user pricing)

### Benefits:
- Predictable costs
- No per-user fees
- Full control
- No vendor lock-in


