# CORS Configuration Fix

## Issue
Frontend running on `http://localhost:8081` was blocked by CORS because backend only allowed `http://localhost:5173`.

## Solution
Updated CORS configuration to allow multiple origins:
- `http://localhost:5173` (Vite default)
- `http://localhost:8081` (Your current port)
- `http://localhost:3000` (Alternative port)

## Configuration

### Development (Default)
The backend now allows common development ports automatically.

### Production
Set `CORS_ORIGIN` in `.env` to specify allowed origins:

```env
# Single origin
CORS_ORIGIN=http://localhost:8081

# Multiple origins (comma-separated)
CORS_ORIGIN=http://localhost:8081,https://yourdomain.com
```

## Testing

After updating, restart the backend server:

```bash
cd backend
npm run dev
```

The CORS error should be resolved and API requests should work.



