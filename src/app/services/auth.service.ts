import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../environments/environment';
import { LoginRequest, AuthResponse, User, JWTPayload } from '../models/types';
import { UrlUtilsService } from './url-utils.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private _http = inject(HttpClient);
  private _router = inject(Router);
  private _apiUrl = environment.apiUrl;
  private _urlUtils = inject(UrlUtilsService);
  private _logger = inject(LoggerService);

  // Reactive state
  private _currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this._currentUserSubject.asObservable();

  // Signals for reactive components
  public isAuthenticated = signal(false);
  public currentUser = signal<User | null>(null);
  public isLoading = signal(false);

  // Subject to notify components about token refresh
  private _tokenRefreshedSubject = new BehaviorSubject<boolean>(false);
  public tokenRefreshed$ = this._tokenRefreshedSubject.asObservable();

  constructor() {
    // Check for existing token on app start
    this._checkAuthState();
  }

  /**
   * Login user
   */
  login(credentials: LoginRequest): Observable<AuthResponse> {
    this.isLoading.set(true);
    return this._http.post<AuthResponse>(`${this._apiUrl}/api/auth/login`, credentials).pipe(
      tap((response) => {
        this._setSession(response);
        this.isLoading.set(false);
      }),
      catchError((error) => {
        this.isLoading.set(false);
        return throwError(() => error);
      }),
    );
  }

  /**
   * Refresh access token
   */
  refreshToken(): Observable<AuthResponse> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      return throwError(() => new Error('No refresh token available'));
    }

    return this._http.post<AuthResponse>(`${this._apiUrl}/api/auth/refresh`, { refreshToken }).pipe(
      tap((response) => {
        this._setSession(response);
      }),
      catchError((error) => {
        this.logout();
        return throwError(() => error);
      }),
    );
  }

  /**
   * Get current user info
   */
  getCurrentUser(): Observable<User> {
    return this._http.get<User>(`${this._apiUrl}/api/auth/me`);
  }

  /**
   * Logout user
   */
  logout(): void {
    // Clear local storage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');

    // Clear state
    this._currentUserSubject.next(null);
    this.currentUser.set(null);
    this.isAuthenticated.set(false);

    // Navigate to login
    this._router.navigate(['/login']);
  }

  /**
   * Check if user is authenticated
   */
  isLoggedIn(): boolean {
    const token = this.getAccessToken();
    if (!token) return false;

    try {
      const payload = this._decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch {
      return false;
    }
  }

  /**
   * Get access token
   */
  getAccessToken(): string | null {
    return localStorage.getItem('accessToken');
  }

  /**
   * Get refresh token
   */
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: string): boolean {
    const user = this.currentUser();
    return user?.role === role || user?.isSuperAdmin === true;
  }

  /**
   * Check if user is super admin
   */
  isSuperAdmin(): boolean {
    const user = this.currentUser();
    return user?.isSuperAdmin === true;
  }

  /**
   * Check if user can access admin features
   */
  canAccessAdmin(): boolean {
    return this.hasRole('admin') || this.isSuperAdmin();
  }

  /**
   * Check if user can access waiter features
   */
  canAccessWaiter(): boolean {
    return this.hasRole('waiter') || this.hasRole('admin') || this.isSuperAdmin();
  }

  /**
   * Get authorization headers for HTTP requests
   * For superadmin users, tenant header is not required (they can access without subdomain)
   */
  getAuthHeaders(skipTenantHeader = false): HttpHeaders {
    const token = this.getAccessToken();
    const headers: { [key: string]: string } = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    // Skip tenant header for superadmin users or if explicitly requested
    // Superadmin can access routes without subdomain
    const isSuperAdmin = this.isSuperAdmin();
    const shouldSkipTenant = skipTenantHeader || isSuperAdmin;

    if (!shouldSkipTenant) {
      // Add tenant subdomain header for regular users
      try {
        const tenantSubdomain = this._extractTenantFromUrl();
        headers['X-Tenant-Subdomain'] = tenantSubdomain;
      } catch (error) {
        // If tenant extraction fails and user is not superadmin, log warning
        // But don't block the request - let backend handle tenant validation
        this._logger.warn('Could not extract tenant subdomain:', error);
      }
    }

    return new HttpHeaders(headers);
  }

  /**
   * Get authorization headers for superadmin requests (no tenant header)
   * Use this for superadmin-specific API calls
   */
  getSuperAdminHeaders(): HttpHeaders {
    return this.getAuthHeaders(true); // Skip tenant header
  }

  /**
   * Extract tenant subdomain from current URL
   */
  private _extractTenantFromUrl(): string {
    return this._urlUtils.extractTenantFromUrl();
  }

  /**
   * Decode JWT token
   */
  private _decodeToken(token: string): JWTPayload {
    const payload = token.split('.')[1];
    const decoded = atob(payload);
    return JSON.parse(decoded);
  }

  /**
   * Set session data
   */
  private _setSession(authResponse: AuthResponse): void {
    localStorage.setItem('accessToken', authResponse.accessToken);
    localStorage.setItem('refreshToken', authResponse.refreshToken);
    localStorage.setItem('user', JSON.stringify(authResponse.user));

    this._currentUserSubject.next(authResponse.user);
    this.currentUser.set(authResponse.user);
    this.isAuthenticated.set(true);

    // Notify about token refresh
    this._tokenRefreshedSubject.next(true);
  }

  /**
   * Check authentication state on app start
   */
  private _checkAuthState(): void {
    const token = this.getAccessToken();
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const user = JSON.parse(userStr);
        this._currentUserSubject.next(user);
        this.currentUser.set(user);
        this.isAuthenticated.set(true);
      } catch {
        // Invalid stored data, clear it
        this.logout();
      }
    }
  }

  /**
   * Auto refresh token if needed
   */
  public autoRefreshToken(): void {
    const token = this.getAccessToken();
    if (!token) return;

    try {
      const payload = this._decodeToken(token);
      const now = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = payload.exp - now;

      // Refresh 5 minutes before expiry
      if (timeUntilExpiry < 300) {
        this.refreshToken().subscribe();
      }
    } catch (error) {
      this._logger.error('Error checking token expiry:', error);
    }
  }
}
