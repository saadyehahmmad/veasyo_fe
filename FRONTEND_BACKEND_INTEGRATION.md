# Frontend-Backend Integration Guide

This document ensures the frontend is properly configured and integrated with the backend.

## ✅ Integration Status

### 1. API Configuration

**Environment Files:**
- `environment.ts` - Development (localhost:3000)
- `environment.production.ts` - Production (configurable)

**Configuration:**
- ✅ API URL configured
- ✅ Socket.IO URL configured
- ✅ Domain URL configured
- ✅ CORS handled properly

### 2. Socket.IO Integration

**Configuration Matches Backend:**
- ✅ Connection timeout: 45 seconds (matches backend)
- ✅ Reconnection enabled with exponential backoff
- ✅ Transport: WebSocket + polling fallback
- ✅ Authentication via JWT token
- ✅ Tenant subdomain passed in auth and query

**Event Handlers:**
- ✅ `new_request` - Receives new service requests
- ✅ `request_sent` - Confirmation when request is sent
- ✅ `request_updated` - Updates to existing requests
- ✅ `request_status` - Status changes
- ✅ `error` - Error messages
- ✅ `auth_error` - Authentication errors

**Client Events:**
- ✅ `join` - Join rooms (waiter, admin, table)
- ✅ `call_waiter` - Send service request
- ✅ `acknowledge_request` - Acknowledge request
- ✅ `complete_request` - Complete request
- ✅ `cancel_request` - Cancel request

### 3. Authentication Integration

**HTTP Interceptor:**
- ✅ Automatically adds `Authorization: Bearer <token>` header
- ✅ Handles token refresh on 401 errors
- ✅ Reconnects Socket.IO after token refresh
- ✅ Adds `X-Tenant-Subdomain` header for tenant-scoped requests

**Token Management:**
- ✅ Stores tokens in localStorage
- ✅ Checks token expiration before requests
- ✅ Refreshes token automatically
- ✅ Logs out on refresh failure

### 4. Tenant Isolation

**Subdomain Extraction:**
- ✅ Extracts tenant from URL subdomain (e.g., `a.localhost`, `restaurant.example.com`)
- ✅ Supports query parameter fallback (`?tenant=restaurant-a`)
- ✅ Validates tenant before API calls
- ✅ Passes tenant to Socket.IO connection

**Tenant Headers:**
- ✅ `X-Tenant-Subdomain` header added to all tenant-scoped requests
- ✅ Superadmin requests skip tenant header
- ✅ Public endpoints (tables, branding) include tenant header

### 5. Error Handling

**HTTP Errors:**
- ✅ 401 Unauthorized - Auto token refresh
- ✅ 429 Too Many Requests - Rate limit handling
- ✅ 500+ Server Errors - User-friendly messages
- ✅ Network errors - Retry logic

**Socket.IO Errors:**
- ✅ Connection errors - Auto reconnection
- ✅ Authentication errors - Token refresh
- ✅ Timeout errors - Retry with backoff

### 6. Rate Limiting

**Client-Side Rate Limiting:**
- ✅ API endpoints: 100 requests per 15 minutes
- ✅ Write operations: 50 requests per 15 minutes
- ✅ Prevents client-side abuse
- ✅ Works with backend rate limiting

## 🔧 Configuration

### Development

```typescript
// frontend/src/environments/environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  socketUrl: 'http://localhost:3000',
  domainURL: 'localhost',
  // ...
};
```

### Production

**Option 1: Same Domain (Nginx Proxy)**
```typescript
// Use relative URLs if nginx proxies to backend
apiUrl: '', // Relative - uses current origin
socketUrl: '', // Relative - uses current origin
```

**Option 2: Different Domain**
```typescript
// Use absolute URLs if backend is on different domain
apiUrl: 'https://api.yourdomain.com',
socketUrl: 'https://api.yourdomain.com',
```

**Option 3: Subdomain**
```typescript
// Use subdomain for API
apiUrl: 'https://api.yourdomain.com',
socketUrl: 'https://api.yourdomain.com',
```

### Nginx Configuration

If using nginx proxy, ensure these routes are configured:

```nginx
# API proxy
location /api/ {
    proxy_pass http://localhost:3000/api/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

# Socket.IO proxy
location /socket.io/ {
    proxy_pass http://localhost:3000/socket.io/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

## 📋 API Endpoints

All endpoints are properly configured:

### Authentication
- ✅ `POST /api/auth/login` - User login
- ✅ `POST /api/auth/refresh` - Refresh token
- ✅ `GET /api/auth/me` - Get current user

### Tables
- ✅ `GET /api/tables` - Get all tables
- ✅ `GET /api/tables/:id` - Get table by ID
- ✅ `POST /api/tables` - Create table
- ✅ `PUT /api/tables/:id` - Update table
- ✅ `DELETE /api/tables/:id` - Delete table

### Service Requests
- ✅ `GET /api/service-requests` - Get requests
- ✅ `GET /api/requests/active-db` - Get active requests
- ✅ `POST /api/service-requests/:id/acknowledge` - Acknowledge
- ✅ `PUT /api/service-requests/:id/complete` - Complete

### Analytics
- ✅ `GET /api/analytics/summary` - Analytics summary
- ✅ `GET /api/analytics/charts` - Chart data
- ✅ `GET /api/analytics/realtime` - Realtime data

### Health
- ✅ `GET /api/health` - Health check
- ✅ `GET /api/health/comprehensive` - Full health check

## 🔍 Verification Checklist

### Development
- [ ] Frontend runs on `http://localhost:4200`
- [ ] Backend runs on `http://localhost:3000`
- [ ] Socket.IO connects successfully
- [ ] API calls work without CORS errors
- [ ] Authentication works
- [ ] Tenant subdomain extraction works

### Production
- [ ] Environment variables configured
- [ ] API URL points to correct backend
- [ ] Socket.IO URL points to correct backend
- [ ] Nginx proxy configured (if using)
- [ ] CORS configured on backend
- [ ] SSL certificates valid
- [ ] Health checks pass

## 🐛 Troubleshooting

### Socket.IO Connection Issues

**Problem:** Socket.IO won't connect
**Solutions:**
1. Check `socketUrl` in environment file
2. Verify backend Socket.IO is running
3. Check CORS configuration on backend
4. Verify tenant subdomain is extracted correctly
5. Check browser console for errors

### CORS Errors

**Problem:** CORS errors in browser console
**Solutions:**
1. Verify backend CORS configuration includes frontend origin
2. Check `apiUrl` in environment file
3. Ensure credentials are included in requests
4. Check backend CORS middleware configuration

### Authentication Issues

**Problem:** 401 Unauthorized errors
**Solutions:**
1. Check token is stored in localStorage
2. Verify token is not expired
3. Check token refresh logic
4. Verify backend JWT secret matches
5. Check `Authorization` header is added

### Tenant Isolation Issues

**Problem:** Wrong tenant data shown
**Solutions:**
1. Verify tenant subdomain extraction
2. Check `X-Tenant-Subdomain` header is added
3. Verify backend tenant validation
4. Check Socket.IO tenant parameter

## 📚 Additional Resources

- Backend API Documentation: `backend/src/server/README.md`
- Socket.IO Events: `backend/src/models/types.ts`
- Frontend Types: `frontend/src/app/models/types.ts`
- Compatibility Analysis: `SCALABILITY_AND_COMPATIBILITY_ANALYSIS.md`

## ✅ Summary

The frontend is **fully integrated** with the backend:

1. ✅ **API Configuration** - All endpoints properly configured
2. ✅ **Socket.IO Integration** - Real-time communication working
3. ✅ **Authentication** - JWT token handling and refresh
4. ✅ **Tenant Isolation** - Multi-tenant support working
5. ✅ **Error Handling** - Comprehensive error handling
6. ✅ **Rate Limiting** - Client-side protection
7. ✅ **CORS** - Properly configured
8. ✅ **Type Safety** - TypeScript types match

The frontend is **production-ready** and well-provided with backend integration.

