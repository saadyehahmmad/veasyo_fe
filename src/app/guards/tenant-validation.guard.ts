import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { UrlUtilsService } from '../services/url-utils.service';
import { LoggerService } from '../services/logger.service';
import { AuthService } from '../services/auth.service';
import { catchError, map, of } from 'rxjs';

/**
 * Guard to validate tenant subdomain before allowing access to routes
 * Returns 404 page for unregistered or inactive tenants
 * Superadmin users can bypass tenant validation (they can access without subdomain)
 */
const NOT_FOUND_ROUTE = '/not-found';

export const tenantValidationGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const http = inject(HttpClient);
  const urlUtils = inject(UrlUtilsService);
  const logger = inject(LoggerService);
  const authService = inject(AuthService);
  const apiUrl = environment.apiUrl;

  // Allow superadmin to bypass tenant validation
  // Superadmin can access routes without subdomain
  if (authService.isSuperAdmin()) {
    return of(true);
  }

  // Routes that should be accessible without subdomain
  // These routes handle their own tenant validation or don't require it
  const routesWithoutSubdomain = ['/login', '/landing', '/not-found'];
  const currentPath = state.url.split('?')[0]; // Remove query params

  try {
    // Extract tenant subdomain from URL
    const subdomain = urlUtils.extractTenantFromUrl();

    // Make API call with tenant header to validate
    // Use a lightweight endpoint - we'll use the tables endpoint as it requires tenant
    return http
      .get(`${apiUrl}/api/tables`, {
        headers: {
          'X-Tenant-Subdomain': subdomain,
          'Skip-Auth': 'true',
        },
      })
      .pipe(
        map(() => {
          // If request succeeds, tenant is valid
          return true;
        }),
        catchError((error) => {
          logger.error('Tenant validation error:', error);

          // Check for 404 tenant not found
          if (error.status === 404 && error.error?.error === 'Tenant not found') {
            router.navigate([NOT_FOUND_ROUTE]);
            return of(false);
          }

          // Check for 403 inactive tenant
          if (error.status === 403 && error.error?.error === 'Tenant account is inactive') {
            router.navigate([NOT_FOUND_ROUTE]);
            return of(false);
          }

          // Check for 400 tenant not specified
          if (error.status === 400 && error.error?.error === 'Tenant not specified') {
            router.navigate([NOT_FOUND_ROUTE]);
            return of(false);
          }

          // For 401 (auth required), allow access - auth guard will handle it
          if (error.status === 401) {
            return of(true);
          }

          // For other errors, allow to continue (don't block on network errors, etc.)
          return of(true);
        }),
      );
  } catch (error) {
    // If subdomain extraction fails, check if this route should be accessible without subdomain
    // Routes like /login should be accessible to allow superadmin login
    // Other routes (like /table/:id) require subdomain and should show not-found
    if (routesWithoutSubdomain.includes(currentPath)) {
      logger.debug('Subdomain extraction failed but route allows access without subdomain:', currentPath);
      return of(true);
    }

    // For routes that require subdomain, redirect to not-found
    logger.error('Subdomain extraction failed for route requiring subdomain:', currentPath, error);
    router.navigate([NOT_FOUND_ROUTE]);
    return of(false);
  }
};
