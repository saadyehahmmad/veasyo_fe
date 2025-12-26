import { Injectable, inject, Injector } from '@angular/core';
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
import { UrlUtilsService } from '../services/url-utils.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private _authService?: AuthService;
  private _urlUtils?: UrlUtilsService;
  private _injector = inject(Injector);
  private _isRefreshing = false;
  private _refreshTokenSubject = new BehaviorSubject<any>(null);

  // Lazy initialization to avoid circular dependency
  private get authService(): AuthService {
    if (!this._authService) {
      this._authService = this._injector.get(AuthService);
    }
    return this._authService;
  }

  private get urlUtils(): UrlUtilsService {
    if (!this._urlUtils) {
      this._urlUtils = this._injector.get(UrlUtilsService);
    }
    return this._urlUtils;
  }

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

    // Client-side rate limiting removed - now handled only on server for auth endpoints
    // This prevents blocking legitimate requests

    // Add auth token and tenant info to request
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
    const token = this.authService.getAccessToken();
    const headers: { [key: string]: string } = {};

    // Add authorization token
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add tenant subdomain header for all API requests
    try {
      const subdomain = this.urlUtils.extractTenantFromUrl();
      if (subdomain) {
        headers['X-Tenant-Subdomain'] = subdomain;
      }
    } catch (error) {
      // If tenant extraction fails, continue without tenant header
      // This allows access to landing page and other non-tenant routes
      console.warn('Could not extract tenant subdomain:', error);
    }

    return req.clone({
      setHeaders: headers,
    });
  }

  private _handle401Error(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this._isRefreshing) {
      this._isRefreshing = true;
      this._refreshTokenSubject.next(null);

      return this.authService.refreshToken().pipe(
        switchMap((tokenResponse: any) => {
          this._isRefreshing = false;
          this._refreshTokenSubject.next(tokenResponse.accessToken);

          // Socket will reconnect automatically on next connection attempt
          // Removed direct socket reconnection to avoid circular dependency

          // Retry the original request with new token
          return next.handle(this._addTokenToRequest(req));
        }),
        catchError((error) => {
          this._isRefreshing = false;
          this.authService.logout();
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

