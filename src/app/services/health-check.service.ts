import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval, catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class HealthCheckService {
  private _http: HttpClient;
  private _apiUrl = environment.apiUrl;
  private _logger = inject(LoggerService);

  // Reactive state
  public isBackendConnected = signal<boolean>(true);
  public lastCheckTime = signal<Date | null>(null);

  constructor(http: HttpClient) {
    this._http = http;
    this._startHealthCheck();
  }

  /**
   * Start periodic health checks
   */
  private _startHealthCheck(): void {
    // Check immediately on startup
    this._checkHealth();

    // Then check every 30 seconds
    interval(30000).subscribe(() => {
      this._checkHealth();
    });
  }

  /**
   * Check backend health
   */
  private _checkHealth(): void {
    this._http
      .get(`${this._apiUrl}/api/health`, {
        observe: 'response',
        // Don't use auth headers for health check
        headers: { 'Skip-Auth': 'true' },
      })
      .pipe(
        tap(() => {
          this.isBackendConnected.set(true);
          this.lastCheckTime.set(new Date());
        }),
        catchError((error) => {
          this._logger.error('Backend health check failed:', error);
          this.isBackendConnected.set(false);
          this.lastCheckTime.set(new Date());
          return of(null);
        }),
      )
      .subscribe();
  }

  /**
   * Manual health check
   */
  public manualCheck(): void {
    this._checkHealth();
  }
}
