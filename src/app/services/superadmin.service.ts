import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap, map } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from './auth.service';
import { Tenant, User } from '../models/types';

// SuperAdmin specific interfaces

// Tenant response from API (minimal fields)
export interface TenantData {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  maxTables: number;
  maxUsers: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Subscription data from API (minimal fields)
export interface SubscriptionData {
  id: string;
  plan: 'free' | 'basic' | 'premium' | 'enterprise';
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  endDate: string;
  amount: number;
  currency: string;
}

// Combined tenant with subscription
export interface TenantWithSubscription {
  id: string;
  tenant: TenantData;
  subscription: SubscriptionData | null;
  warning: string | null;
}

// API response structure
export interface TenantsResponse {
  tenants: TenantWithSubscription[];
}

// Legacy interface for backward compatibility with Tenant type
export interface TenantWithSubscriptionLegacy extends Tenant {
  subscription?: {
    id: string;
    plan: string;
    status: 'active' | 'expired' | 'cancelled';
    expiresAt: Date;
    features: string[];
  };
  stats?: {
    users: number;
    tables: number;
    requests: number;
  };
}

// Analytics response from API
export interface PlatformAnalytics {
  platform: {
    tenants: {
      total: number;
      active: number;
      inactive: number;
    };
    users: {
      total: number;
      active: number;
      admins: number;
      waiters: number;
    };
    tables: {
      total: number;
      active: number;
    };
    requests: {
      total: number;
      pending: number;
      completed: number;
    };
    subscriptions: {
      total: number;
      active: number;
      expired: number;
    };
  };
  subscriptions: {
    total: number;
    active: number;
    expired: number;
    cancelled: number;
    suspended: number;
    byPlan: {
      premium: number;
      basic: number;
      free: number;
    };
    totalRevenue: number;
  };
  tenantAnalytics: Array<{
    tenantId: string;
    tenantName: string;
    analytics: {
      totalRequests: number;
      pendingRequests: number;
      completedRequests: number;
      averageResponseTime: number;
      averageCompletionTime: number;
    } | null;
    error?: string;
  }>;
}

export interface AuditLog {
  id: string;
  tenantId?: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  user?: {
    fullName: string;
    email: string;
  };
  tenant?: {
    name: string;
    subdomain: string;
  };
}

// User data from API with tenant info
export interface UserData {
  id: string;
  tenantId: string | null;
  username: string;
  email: string;
  role: 'superadmin' | 'admin' | 'waiter';
  fullName: string;
  active: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  tenantName: string | null;
  tenantSubdomain: string | null;
}

// Users response from API
export interface UsersResponse {
  users: UserData[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Legacy interface for backward compatibility
export interface UserWithTenant extends User {
  tenantName: string;
  tenantSubdomain: string;
}

@Injectable({
  providedIn: 'root',
})
export class SuperAdminService {
  private _http = inject(HttpClient);
  private _authService = inject(AuthService);
  private _apiUrl = environment.apiUrl;

  // Reactive state
  private _tenantsSubject = new BehaviorSubject<TenantWithSubscription[]>([]);
  public tenants$ = this._tenantsSubject.asObservable();

  private _usersSubject = new BehaviorSubject<UserData[]>([]);
  public users$ = this._usersSubject.asObservable();

  private _analyticsSubject = new BehaviorSubject<PlatformAnalytics | null>(null);
  public analytics$ = this._analyticsSubject.asObservable();

  // Signals
  public isLoading = signal(false);
  public error = signal<string | null>(null);

  // ============================================
  // TENANT MANAGEMENT
  // ============================================

  /**
   * Get all tenants with subscription information
   */
  getAllTenants(): Observable<TenantWithSubscription[]> {
    this.isLoading.set(true);
    return this._http
      .get<TenantsResponse>(`${this._apiUrl}/api/superadmin/tenants`, {
        headers: this._authService.getSuperAdminHeaders(), // Use superadmin headers (no tenant required)
      })
      .pipe(
        map((response) => response.tenants),
        tap({
          next: (tenants) => {
            this._tenantsSubject.next(tenants);
            this.isLoading.set(false);
            this.error.set(null);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.error.set(error.message || 'Failed to load tenants');
          },
        }),
      );
  }

  /**
   * Search tenants (for autocomplete/dropdown)
   */
  searchTenants(query: string, limit = 20): Observable<TenantData[]> {
    const params: any = { limit: limit.toString() };
    if (query) {
      params.q = query;
    }

    return this._http
      .get<{ tenants: TenantData[] }>(`${this._apiUrl}/api/superadmin/tenants/search`, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
        params,
      })
      .pipe(map((response) => response.tenants));
  }

  /**
   * Get detailed tenant information
   */
  getTenantDetails(tenantId: string): Observable<TenantWithSubscription> {
    return this._http.get<TenantWithSubscription>(
      `${this._apiUrl}/api/superadmin/tenants/${tenantId}`,
      {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      },
    );
  }

  /**
   * Create a new tenant
   */
  createTenant(tenantData: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Observable<Tenant> {
    return this._http
      .post<Tenant>(`${this._apiUrl}/api/superadmin/tenants`, tenantData, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      })
      .pipe(tap(() => this._refreshTenants()));
  }

  /**
   * Update tenant
   */
  updateTenant(tenantId: string, updates: Partial<Tenant>): Observable<Tenant> {
    return this._http
      .put<Tenant>(`${this._apiUrl}/api/superadmin/tenants/${tenantId}`, updates, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      })
      .pipe(tap(() => this._refreshTenants()));
  }

  /**
   * Activate/Deactivate tenant
   */
  toggleTenantStatus(tenantId: string, active: boolean): Observable<Tenant> {
    return this._http
      .patch<Tenant>(
        `${this._apiUrl}/api/superadmin/tenants/${tenantId}/status`,
        { active },
        {
          headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
        },
      )
      .pipe(tap(() => this._refreshTenants()));
  }

  /**
   * Delete tenant
   */
  deleteTenant(tenantId: string): Observable<void> {
    return this._http
      .delete<void>(`${this._apiUrl}/api/superadmin/tenants/${tenantId}`, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      })
      .pipe(tap(() => this._refreshTenants()));
  }

  // ============================================
  // USER MANAGEMENT
  // ============================================

  /**
   * Get all users across all tenants (legacy - non-paginated)
   */
  getAllUsers(): Observable<UserData[]> {
    this.isLoading.set(true);
    return this._http
      .get<UsersResponse>(`${this._apiUrl}/api/superadmin/users`, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      })
      .pipe(
        map((response) => response.users),
        tap({
          next: (users) => {
            this._usersSubject.next(users);
            this.isLoading.set(false);
            this.error.set(null);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.error.set(error.message || 'Failed to load users');
          },
        }),
      );
  }

  /**
   * Get paginated users with filters
   */
  getUsersPaginated(params: {
    page: number;
    limit: number;
    search?: string;
    tenantId?: string;
    role?: string;
    active?: boolean;
  }): Observable<UsersResponse> {
    this.isLoading.set(true);

    const httpParams: any = {
      page: params.page.toString(),
      limit: params.limit.toString(),
    };

    if (params.search) httpParams.search = params.search;
    if (params.tenantId) httpParams.tenantId = params.tenantId;
    if (params.role) httpParams.role = params.role;
    if (params.active !== undefined) httpParams.active = params.active.toString();

    return this._http
      .get<UsersResponse>(`${this._apiUrl}/api/superadmin/users`, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
        params: httpParams,
      })
      .pipe(
        tap({
          next: (response) => {
            this._usersSubject.next(response.users);
            this.isLoading.set(false);
            this.error.set(null);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.error.set(error.message || 'Failed to load users');
          },
        }),
      );
  }

  /**
   * Get user details
   */
  getUserDetails(userId: string): Observable<UserWithTenant> {
    return this._http.get<UserWithTenant>(`${this._apiUrl}/api/superadmin/users/${userId}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Create user for any tenant
   */
  createUser(
    userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>,
  ): Observable<User> {
    return this._http
      .post<User>(`${this._apiUrl}/api/superadmin/users`, userData, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      })
      .pipe(tap(() => this._refreshUsers()));
  }

  /**
   * Update user (can change tenant, role, etc.)
   */
  updateUser(userId: string, updates: Partial<User>): Observable<User> {
    return this._http
      .put<User>(`${this._apiUrl}/api/superadmin/users/${userId}`, updates, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      })
      .pipe(tap(() => this._refreshUsers()));
  }

  /**
   * Delete user
   */
  deleteUser(userId: string): Observable<void> {
    return this._http
      .delete<void>(`${this._apiUrl}/api/superadmin/users/${userId}`, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      })
      .pipe(tap(() => this._refreshUsers()));
  }

  /**
   * Reset user password
   */
  resetUserPassword(userId: string): Observable<{ tempPassword: string; user: any }> {
    return this._http
      .post<{ tempPassword: string; user: any }>(
        `${this._apiUrl}/api/superadmin/users/${userId}/reset-password`,
        {},
        {
          headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
        },
      )
      .pipe(tap(() => this._refreshUsers()));
  }

  // ============================================
  // ANALYTICS & MONITORING
  // ============================================

  /**
   * Get platform-wide analytics
   */
  getPlatformAnalytics(): Observable<PlatformAnalytics> {
    return this._http
      .get<PlatformAnalytics>(`${this._apiUrl}/api/superadmin/analytics`, {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      })
      .pipe(tap((analytics) => this._analyticsSubject.next(analytics)));
  }

  /**
   * Get audit logs
   */
  getAuditLogs(limit = 50): Observable<AuditLog[]> {
    return this._http.get<AuditLog[]>(`${this._apiUrl}/api/superadmin/audit-logs?limit=${limit}`, {
      headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
    });
  }

  /**
   * Get tenant-specific audit logs
   */
  getTenantAuditLogs(tenantId: string, limit = 50): Observable<AuditLog[]> {
    return this._http.get<AuditLog[]>(
      `${this._apiUrl}/api/superadmin/tenants/${tenantId}/audit-logs?limit=${limit}`,
      {
        headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
      },
    );
  }

  /**
   * Get subscription information
   */
  getAllSubscriptions(): Observable<any[]> {
    return this._http.get<any[]>(`${this._apiUrl}/api/superadmin/subscriptions`, {
      headers: this._authService.getSuperAdminHeaders(), // Superadmin requests don't require tenant
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Refresh tenants data
   */
  private _refreshTenants(): void {
    this.getAllTenants().subscribe();
  }

  /**
   * Refresh users data
   */
  private _refreshUsers(): void {
    this.getAllUsers().subscribe();
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this._tenantsSubject.next([]);
    this._usersSubject.next([]);
    this._analyticsSubject.next(null);
  }

  /**
   * Check if user is superadmin
   */
  isSuperAdmin(): boolean {
    const user = this._authService.currentUser();
    return user?.isSuperAdmin === true || user?.role === 'superadmin';
  }
}
