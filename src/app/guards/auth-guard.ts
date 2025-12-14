import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  // Check if user is authenticated
  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  // Check role-based access if required
  const requiredRoles = route.data?.['roles'] as string[];
  if (requiredRoles && requiredRoles.length > 0) {
    const user = authService.currentUser();
    if (!user || !requiredRoles.includes(user.role)) {
      // User doesn't have required role
      router.navigate(['/login']);
      return false;
    }
  }

  return true;
};

export const adminGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.canAccessAdmin()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

export const superAdminGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.isSuperAdmin()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};

export const waiterGuard: CanActivateFn = (_route, _state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (!authService.canAccessWaiter()) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
