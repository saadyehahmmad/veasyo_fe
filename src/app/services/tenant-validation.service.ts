import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, catchError, of, tap } from 'rxjs';
import { environment } from '../environments/environment';
import { UrlUtilsService } from './url-utils.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class TenantValidationService {
  private _http = inject(HttpClient);
  private _router = inject(Router);
  private _urlUtils = inject(UrlUtilsService);
  private _apiUrl = environment.apiUrl;
  private _tenantValid = false;
  private _logger = inject(LoggerService);

  /**
   * Validate tenant before app loads
   */
  validateTenant(): Observable<boolean> {
    try {
      // Extract tenant subdomain from URL
      const subdomain = this._urlUtils.extractTenantFromUrl();

      // Make a simple API call to validate tenant
      // We'll use a lightweight endpoint that requires tenant
      return this._http
        .get<any>(`${this._apiUrl}/api/health`, {
          headers: {
            'X-Tenant-Subdomain': subdomain,
            'Skip-Auth': 'true',
          },
        })
        .pipe(
          tap(() => {
            this._tenantValid = true;
          }),
          catchError((error) => {
            // If it's a 404 tenant not found error, redirect to not-found page
            if (error.status === 404 && error.error?.error === 'Tenant not found') {
              this._router.navigate(['/not-found']);
              return of(false);
            }
            // If it's a 403 inactive tenant error, redirect to not-found page
            if (error.status === 403 && error.error?.error === 'Tenant account is inactive') {
              this._router.navigate(['/not-found']);
              return of(false);
            }
            // For other errors, allow the app to continue
            return of(true);
          }),
        );
    } catch (error) {
      // If subdomain extraction fails, allow landing page to show
      this._logger.error('Tenant extraction error:', error);
      return of(true);
    }
  }

  isTenantValid(): boolean {
    return this._tenantValid;
  }
}
