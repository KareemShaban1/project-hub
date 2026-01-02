# Starting the Backend Server

## Quick Start

The backend server needs to be running for the frontend to work. 

### Start the Server

```bash
cd backend
npm run dev
```

You should see:
```
🚀 Server running on http://localhost:3001
📊 Environment: development
```

### If You Get Errors

1. **Missing dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Database connection error:**
   - Check `.env` file exists in `backend/` directory
   - Verify `DATABASE_URL` is correct
   - Ensure MySQL is running

3. **Port already in use:**
   - Change `PORT` in `backend/.env` to a different port (e.g., 3002)
   - Update `VITE_API_URL` in frontend `.env` to match

### Required Environment Variables

Create `backend/.env` file:

```env
DATABASE_URL="mysql://username:password@localhost:3306/project_manager"
JWT_SECRET="your-super-secret-jwt-key-change-this"
JWT_EXPIRES_IN="7d"
PORT=3001
NODE_ENV=development
CORS_ORIGIN="http://localhost:8081"
```

### Verify Server is Running

Open in browser: http://localhost:3001/health

Should return:
```json
{"status":"ok","timestamp":"..."}
```

## Troubleshooting

### Server won't start
- Check Node.js version: `node --version` (should be 18+)
- Check if port 3001 is available
- Check `.env` file exists and has correct values

### Connection refused
- Server is not running - start it with `npm run dev`
- Wrong port - check `PORT` in `.env`
- Firewall blocking - check Windows Firewall settings

### Database errors
- MySQL not running - start MySQL service
- Wrong credentials - check `DATABASE_URL` in `.env`
- Database doesn't exist - create it: `CREATE DATABASE project_manager;`



