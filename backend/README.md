# Project Manager SaaS - Backend API

Express.js backend API for the Project Manager SaaS application with multi-tenant architecture.

## Features

- ✅ JWT-based authentication
- ✅ Multi-tenant data isolation
- ✅ Project and task management
- ✅ Team invitations
- ✅ Activity logging
- ✅ Role-based permissions

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Required environment variables:
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - Frontend URL for CORS

### 3. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database (development)
npm run prisma:push

# Or use migrations (production)
npm run prisma:migrate
```

### 4. Start Development Server

```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new account
- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/me` - Get current user

### Projects

- `GET /api/projects` - List all projects
- `GET /api/projects/:id` - Get project details
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `GET /api/projects/:id/tasks` - Get project tasks

### Tasks

- `POST /api/tasks` - Create task
- `GET /api/tasks/:id` - Get task details
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Invitations

- `POST /api/invitations` - Create invitation
- `GET /api/invitations/:token` - Get invitation details
- `POST /api/invitations/:token/accept` - Accept invitation

## Architecture

### Multi-Tenancy

The application uses **row-level multi-tenancy** where every table includes a `tenant_id` column. All queries are automatically filtered by the authenticated user's tenant ID.

### Authentication Flow

1. User signs up/in → JWT token generated with `userId`, `tenantId`, and `email`
2. Token stored in localStorage on frontend
3. All API requests include token in `Authorization: Bearer <token>` header
4. Backend verifies token and extracts tenant context
5. All database queries filtered by `tenantId`

### Security

- JWT tokens expire after 7 days (configurable)
- Tenant isolation enforced at middleware level
- Role-based access control for projects
- Input validation with Zod schemas
- SQL injection protection via Prisma

## Development

### Project Structure

```
backend/
├── src/
│   ├── routes/          # API route handlers
│   ├── middleware/      # Auth, tenant, error handling
│   ├── services/        # Database service
│   ├── utils/           # Helper functions
│   └── server.ts        # Express app entry point
├── prisma/
│   └── schema.prisma    # Database schema
└── package.json
```

### Adding New Routes

1. Create route file in `src/routes/`
2. Import and use in `src/server.ts`
3. Apply `authenticate` and `tenantMiddleware` middleware
4. Use `ensureTenantAccess` for tenant validation
5. Use `checkProjectAccess` for project permissions

## Production Deployment

1. Set `NODE_ENV=production`
2. Use strong `JWT_SECRET`
3. Configure proper CORS origins
4. Set up database connection pooling
5. Enable rate limiting
6. Set up monitoring and logging
7. Configure SSL/TLS

## License

MIT



