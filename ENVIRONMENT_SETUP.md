# Environment Configuration Guide

This guide explains how to configure the frontend environment for different deployment scenarios.

## Environment Files

### Development (`environment.ts`)

```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000',
  socketUrl: 'http://localhost:3000',
  domainURL: 'localhost',
  contactusEmail: 'example@gmail.com',
  defaultLanguage: 'en',
  supportedLanguages: ['en', 'ar'],
};
```

**Usage:** Local development with backend on `localhost:3000`

### Production (`environment.production.ts`)

The production environment supports multiple deployment scenarios:

#### Scenario 1: Same Domain (Nginx Proxy)

If frontend and backend are on the same domain with nginx proxying:

```typescript
export const environment = {
  production: true,
  apiUrl: '', // Empty = relative URL (uses current origin)
  socketUrl: '', // Empty = relative URL (uses current origin)
  domainURL: 'https://yourdomain.com',
  // ...
};
```

**Nginx Configuration:**
```nginx
location /api/ {
    proxy_pass http://backend:3000/api/;
}

location /socket.io/ {
    proxy_pass http://backend:3000/socket.io/;
}
```

#### Scenario 2: Different Domain

If backend is on a different domain:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com',
  socketUrl: 'https://api.yourdomain.com',
  domainURL: 'https://yourdomain.com',
  // ...
};
```

**Backend CORS Configuration:**
```typescript
// backend/src/server/middleware.config.ts
origin: ['https://yourdomain.com', 'https://www.yourdomain.com']
```

#### Scenario 3: Subdomain

If backend is on a subdomain:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://api.yourdomain.com',
  socketUrl: 'https://api.yourdomain.com',
  domainURL: 'https://yourdomain.com',
  // ...
};
```

## Build-Time Configuration

### Using Angular Environment Variables

Angular doesn't support runtime environment variables by default. For build-time configuration:

1. **Create environment-specific files:**
   - `environment.production.ts` - Production
   - `environment.staging.ts` - Staging
   - `environment.development.ts` - Development

2. **Update `angular.json`:**
```json
{
  "projects": {
    "frontend": {
      "architect": {
        "build": {
          "configurations": {
            "production": {
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.production.ts"
                }
              ]
            },
            "staging": {
              "fileReplacements": [
                {
                  "replace": "src/environments/environment.ts",
                  "with": "src/environments/environment.staging.ts"
                }
              ]
            }
          }
        }
      }
    }
  }
}
```

3. **Build with configuration:**
```bash
# Production
ng build --configuration production

# Staging
ng build --configuration staging
```

### Using Docker Environment Variables

For Docker deployments, you can use a build script:

**`build.sh`:**
```bash
#!/bin/bash

# Read environment variables
API_URL=${API_URL:-"https://api.yourdomain.com"}
SOCKET_URL=${SOCKET_URL:-"https://api.yourdomain.com"}
DOMAIN_URL=${DOMAIN_URL:-"https://yourdomain.com"}

# Create environment file
cat > src/environments/environment.production.ts << EOF
export const environment = {
  production: true,
  apiUrl: '${API_URL}',
  socketUrl: '${SOCKET_URL}',
  domainURL: '${DOMAIN_URL}',
  contactusEmail: 'support@yourdomain.com',
  defaultLanguage: 'ar',
  supportedLanguages: ['en', 'ar'],
};
EOF

# Build
ng build --configuration production
```

**Dockerfile:**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci

COPY . .
RUN chmod +x build.sh
RUN ./build.sh

FROM nginx:alpine
COPY --from=builder /app/dist/frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
```

**docker-compose.yml:**
```yaml
services:
  frontend:
    build:
      context: ./frontend
      args:
        API_URL: https://api.yourdomain.com
        SOCKET_URL: https://api.yourdomain.com
        DOMAIN_URL: https://yourdomain.com
    ports:
      - "80:80"
```

## Runtime Configuration (Advanced)

For true runtime configuration, you can load config from a JSON file:

**`src/app/config/config.service.ts`:**
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private config: any = null;

  constructor(private http: HttpClient) {}

  async loadConfig(): Promise<void> {
    try {
      this.config = await firstValueFrom(
        this.http.get('/assets/config.json')
      );
    } catch (error) {
      console.error('Failed to load config, using defaults');
      this.config = {
        apiUrl: window.location.origin,
        socketUrl: window.location.origin,
      };
    }
  }

  get apiUrl(): string {
    return this.config?.apiUrl || window.location.origin;
  }

  get socketUrl(): string {
    return this.config?.socketUrl || window.location.origin;
  }
}
```

**`src/assets/config.json`:**
```json
{
  "apiUrl": "https://api.yourdomain.com",
  "socketUrl": "https://api.yourdomain.com",
  "domainURL": "https://yourdomain.com"
}
```

**`src/app/app.config.ts`:**
```typescript
import { APP_INITIALIZER } from '@angular/core';
import { ConfigService } from './config/config.service';

export function initializeApp(configService: ConfigService) {
  return () => configService.loadConfig();
}

export const appConfig: ApplicationConfig = {
  providers: [
    // ... other providers
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConfigService],
      multi: true,
    },
  ],
};
```

## Testing Configuration

### Local Testing

1. Start backend: `cd backend && npm start`
2. Start frontend: `cd frontend && ng serve`
3. Access: `http://localhost:4200` or `http://a.localhost:4200` (with tenant)

### Production Testing

1. Build: `ng build --configuration production`
2. Serve: `npx http-server dist/frontend -p 8080`
3. Test API connection in browser console

## Verification

After configuration, verify:

1. **API Connection:**
   ```typescript
   // In browser console
   fetch(environment.apiUrl + '/api/health')
     .then(r => r.json())
     .then(console.log);
   ```

2. **Socket.IO Connection:**
   - Open browser DevTools → Network
   - Look for WebSocket connection to `/socket.io/`
   - Check for connection errors

3. **CORS:**
   - Check browser console for CORS errors
   - Verify backend CORS includes frontend origin

## Common Issues

### Issue: CORS Errors

**Solution:** Ensure backend CORS configuration includes frontend origin:
```typescript
// backend/src/server/middleware.config.ts
origin: ['http://localhost:4200', 'https://yourdomain.com']
```

### Issue: Socket.IO Won't Connect

**Solution:** 
1. Check `socketUrl` matches backend URL
2. Verify WebSocket is not blocked by firewall
3. Check backend Socket.IO is running
4. Verify CORS allows WebSocket upgrade

### Issue: API Calls Fail

**Solution:**
1. Check `apiUrl` is correct
2. Verify backend is running
3. Check network tab for request details
4. Verify authentication token is valid

## Summary

- ✅ **Development:** Use `environment.ts` with localhost URLs
- ✅ **Production:** Configure `environment.production.ts` based on deployment
- ✅ **Same Domain:** Use relative URLs with nginx proxy
- ✅ **Different Domain:** Use absolute URLs with CORS configuration
- ✅ **Testing:** Verify API and Socket.IO connections work

The frontend is now properly configured to work with the backend in all deployment scenarios.

