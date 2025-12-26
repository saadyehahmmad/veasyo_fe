import { Injectable, inject, effect } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { HealthCheckService } from '../services/health-check.service';
import { MaintenanceModalComponent } from '../components/maintenance-modal/maintenance-modal.component';

@Injectable()
export class BackendErrorInterceptor implements HttpInterceptor {
  private _dialog = inject(MatDialog);
  private _snackBar = inject(MatSnackBar);
  private _healthCheckService = inject(HealthCheckService);
  private _router = inject(Router);
  private _maintenanceModalOpen = false;
  private _tenantNotFoundHandled = false;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Skip health check requests
    if (req.url.includes('/api/health') || req.headers.has('Skip-Auth')) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        // Check for subscription limit errors (403)
        if (error.status === 403 && error.error?.code) {
          const code = error.error.code;
          const message = error.error.message || 'Action not allowed';

          if (code === 'TABLE_LIMIT_EXCEEDED') {
            this._showSubscriptionLimitError(
              'Table Limit Reached',
              message,
              'tables'
            );
          } else if (code === 'USER_LIMIT_EXCEEDED') {
            this._showSubscriptionLimitError(
              'User Limit Reached',
              message,
              'users'
            );
          } else if (code === 'PRINTER_LIMIT_EXCEEDED') {
            this._showSubscriptionLimitError(
              'Printer Limit Reached',
              message,
              'printers'
            );
          } else if (code === 'SUBSCRIPTION_INACTIVE') {
            this._showSubscriptionInactiveError(message);
          }
          
          return throwError(() => error);
        }

        // Check if it's a license error (403)
        if (error.status === 403 && !req.url.includes('/api/health')) {
          return throwError(() => error);
        }

        // Check if it's a tenant not found error (404)
        if (
          error.status === 404 &&
          error.error?.error === 'Tenant not found' &&
          !this._tenantNotFoundHandled
        ) {
          this._tenantNotFoundHandled = true;
          this._router.navigate(['/not-found']);
          return throwError(() => error);
        }

        // Check if it's a network error (backend not reachable)
        if (error.status === 0 || error.status === 504 || error.status === 503) {
          this._healthCheckService.isBackendConnected.set(false);
          this._showMaintenanceModal();
        }

        return throwError(() => error);
      }),
    );
  }

  private _showSubscriptionLimitError(title: string, message: string, _limitType: string): void {
    this._snackBar.open(
      message,
      'Upgrade Plan',
      {
        duration: 10000,
        panelClass: ['subscription-limit-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top',
      }
    ).onAction().subscribe(() => {
      // Navigate to subscription page
      this._router.navigate(['/admin/subscription']);
    });
  }

  private _showSubscriptionInactiveError(message: string): void {
    this._snackBar.open(
      message,
      'Contact Support',
      {
        duration: 15000,
        panelClass: ['subscription-inactive-snackbar'],
        horizontalPosition: 'center',
        verticalPosition: 'top',
      }
    );
  }

  private _showMaintenanceModal(): void {
    if (!this._maintenanceModalOpen) {
      this._maintenanceModalOpen = true;

      const dialogRef = this._dialog.open(MaintenanceModalComponent, {
        disableClose: true,
        width: '500px',
        panelClass: 'maintenance-dialog',
      });

      // Watch for backend connection to be restored using effect
      effect(() => {
        const connected = this._healthCheckService.isBackendConnected();
        if (connected && this._maintenanceModalOpen) {
          dialogRef.close();
          this._maintenanceModalOpen = false;
        }
      });
    }
  }
}
