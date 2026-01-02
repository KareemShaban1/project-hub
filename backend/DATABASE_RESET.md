# Database Reset Instructions

## Issue
Prisma is trying to alter existing tables which is causing SQL syntax errors. The database likely has old tables from a previous schema.

## Solution Options

### Option 1: Reset Database (Recommended for Development)

**⚠️ WARNING: This will DELETE ALL DATA**

```bash
cd backend

# Reset the database (drops all tables and recreates them)
npx prisma migrate reset

# Or manually drop and recreate:
# 1. Connect to MySQL
mysql -u root -p

# 2. Drop and recreate database
DROP DATABASE project_manager;
CREATE DATABASE project_manager;

# 3. Exit MySQL
EXIT;

# 4. Push schema
npm run prisma:push
```

### Option 2: Use Migrations (Recommended for Production)

```bash
cd backend

# Create initial migration
npx prisma migrate dev --name init

# This will:
# - Create migration files
# - Apply them to database
# - Generate Prisma client
```

### Option 3: Force Push (Development Only)

```bash
cd backend

# Force push (will drop and recreate tables)
npx prisma db push --force-reset
```

## Recommended Approach

For a fresh development setup, use **Option 1** or **Option 3**.

For production or when you have existing data, use **Option 2** (migrations).

## After Reset

Once the schema is pushed successfully, you can start the backend:

```bash
npm run dev
```



