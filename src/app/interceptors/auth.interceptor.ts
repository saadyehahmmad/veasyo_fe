import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import { SocketService } from '../services/socket.service';
import { RateLimitService } from '../services/rate-limit.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private _authService = inject(AuthService);
  private _socketService = inject(SocketService);
  private _rateLimitService = inject(RateLimitService);
  private _isRefreshing = false;
  private _refreshTokenSubject = new BehaviorSubject<any>(null);

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip auth for health checks and auth endpoints
    if (
      req.url.includes('/api/health') ||
      req.url.includes('/api/auth/login') ||
      req.url.includes('/api/auth/refresh') ||
      req.headers.has('Skip-Auth')
    ) {
      return next.handle(req);
    }

    // Client-side rate limiting check
    // Only apply to API endpoints (not Socket.IO, health checks, etc.)
    if (req.url.startsWith('/api/') || req.url.includes('/api/')) {
      const endpoint = new URL(req.url, window.location.origin).pathname;
      
      // Different limits for different endpoint types
      let limit = 100; // Default limit
      let windowMs = 15 * 60 * 1000; // 15 minutes
      
      // Stricter limits for write operations
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'DELETE') {
        limit = 50; // Lower limit for write operations
        windowMs = 15 * 60 * 1000;
      }
      
      // Check rate limit
      if (!this._rateLimitService.checkRateLimit(endpoint, limit, windowMs)) {
        // Rate limited - return error
        return throwError(() => new HttpErrorResponse({
          error: { message: 'Too many requests. Please wait a moment before trying again.' },
          status: 429,
          statusText: 'Too Many Requests',
        }));
      }
    }

    // Add auth token to request
    const authReq = this._addTokenToRequest(req);

    return next.handle(authReq).pipe(
      catchError((error: HttpErrorResponse) => {
        // Handle 401 Unauthorized errors (expired token)
        if (error.status === 401 && !req.url.includes('/api/auth/refresh')) {
          return this._handle401Error(req, next);
        }

        return throwError(() => error);
      }),
    );
  }

  private _addTokenToRequest(req: HttpRequest<any>): HttpRequest<any> {
    const token = this._authService.getAccessToken();

    if (token) {
      return req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });
    }

    return req;
  }

  private _handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this._isRefreshing) {
      this._isRefreshing = true;
      this._refreshTokenSubject.next(null);

      return this._authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
          this._isRefreshing = false;
          this._refreshTokenSubject.next(tokenResponse.accessToken);

          // Reconnect socket with new token
          this._socketService.reconnect();

          // Retry the original request with new token
          return next.handle(this._addTokenToRequest(req));
        }),
        catchError((error) => {
          this._isRefreshing = false;
          this._authService.logout();
          return throwError(() => error);
        }),
      );
    } else {
      // Wait for the token refresh to complete
      return this._refreshTokenSubject.pipe(
        filter((token) => token !== null),
        take(1),
        switchMap(() => next.handle(this._addTokenToRequest(req))),
      );
    }
  }
}
