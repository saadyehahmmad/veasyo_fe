import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';
import {
  PricingPlan,
  PricingAddons,
  CustomPlanCalculation,
  Subscription,
  SubscriptionDetails,
  SubscriptionAnalytics,
  CreateSubscriptionRequest,
  UpdateSubscriptionRequest,
  PlanSuggestion,
} from '../models/subscription.model';

interface PricingPlansResponse {
  plans: PricingPlan[];
  addons: PricingAddons;
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private _http = inject(HttpClient);
  private _authService = inject(AuthService);
  private _apiUrl = environment.apiUrl;

  // Reactive state
  private _currentSubscriptionSubject = new BehaviorSubject<SubscriptionDetails | null>(null);
  public currentSubscription$ = this._currentSubscriptionSubject.asObservable();

  private _pricingPlansSubject = new BehaviorSubject<PricingPlan[]>([]);
  public pricingPlans$ = this._pricingPlansSubject.asObservable();

  private _addonsSubject = new BehaviorSubject<PricingAddons | null>(null);
  public addons$ = this._addonsSubject.asObservable();

  // Signals
  public isLoading = signal(false);
  public error = signal<string | null>(null);

  // ============================================
  // PRICING INFORMATION
  // ============================================

  /**
   * Get all pricing plans and add-on pricing
   */
  getPricingPlans(): Observable<PricingPlansResponse> {
    this.isLoading.set(true);
    return this._http
      .get<PricingPlansResponse>(`${this._apiUrl}/api/superadmin/pricing/plans`, {
        headers: this._authService.getSuperAdminHeaders(),
      })
      .pipe(
        tap({
          next: (response) => {
            this._pricingPlansSubject.next(response.plans);
            this._addonsSubject.next(response.addons);
            this.isLoading.set(false);
            this.error.set(null);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.error.set(error.message || 'Failed to load pricing plans');
          },
        })
      );
  }

  /**
   * Calculate custom plan pricing
   */
  calculateCustomPrice(
    tables: number,
    waiters: number,
    printers = 0
  ): Observable<CustomPlanCalculation> {
    return this._http.post<CustomPlanCalculation>(
      `${this._apiUrl}/api/superadmin/pricing/calculate`,
      { tables, waiters, printers },
      {
        headers: this._authService.getSuperAdminHeaders(),
      }
    );
  }

  // ============================================
  // SUBSCRIPTION MANAGEMENT (SUPERADMIN)
  // ============================================

  /**
   * Create subscription for tenant (SuperAdmin only)
   */
  createSubscription(request: CreateSubscriptionRequest): Observable<{ message: string; subscription: Subscription }> {
    return this._http.post<{ message: string; subscription: Subscription }>(
      `${this._apiUrl}/api/superadmin/subscriptions`,
      request,
      {
        headers: this._authService.getSuperAdminHeaders(),
      }
    );
  }

  /**
   * Update subscription (SuperAdmin only)
   */
  updateSubscription(
    tenantId: string,
    request: UpdateSubscriptionRequest
  ): Observable<{ message: string; subscription: Subscription }> {
    return this._http.put<{ message: string; subscription: Subscription }>(
      `${this._apiUrl}/api/superadmin/subscriptions/${tenantId}`,
      request,
      {
        headers: this._authService.getSuperAdminHeaders(),
      }
    );
  }

  /**
   * Get subscription details with usage (SuperAdmin only)
   */
  getSubscriptionDetails(tenantId: string): Observable<SubscriptionDetails> {
    this.isLoading.set(true);
    return this._http
      .get<SubscriptionDetails>(`${this._apiUrl}/api/superadmin/subscriptions/${tenantId}`, {
        headers: this._authService.getSuperAdminHeaders(),
      })
      .pipe(
        tap({
          next: (details) => {
            this._currentSubscriptionSubject.next(details);
            this.isLoading.set(false);
            this.error.set(null);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.error.set(error.message || 'Failed to load subscription details');
          },
        })
      );
  }

  /**
   * Renew subscription (SuperAdmin only)
   */
  renewSubscription(tenantId: string, months = 1): Observable<{ message: string; subscription: Subscription }> {
    return this._http.post<{ message: string; subscription: Subscription }>(
      `${this._apiUrl}/api/superadmin/subscriptions/${tenantId}/renew`,
      { months },
      {
        headers: this._authService.getSuperAdminHeaders(),
      }
    );
  }

  /**
   * Cancel subscription (SuperAdmin only)
   */
  cancelSubscription(tenantId: string): Observable<{ message: string; subscription: Subscription }> {
    return this._http.post<{ message: string; subscription: Subscription }>(
      `${this._apiUrl}/api/superadmin/subscriptions/${tenantId}/cancel`,
      {},
      {
        headers: this._authService.getSuperAdminHeaders(),
      }
    );
  }

  /**
   * Suspend subscription (SuperAdmin only)
   */
  suspendSubscription(tenantId: string): Observable<{ message: string; subscription: Subscription }> {
    return this._http.post<{ message: string; subscription: Subscription }>(
      `${this._apiUrl}/api/superadmin/subscriptions/${tenantId}/suspend`,
      {},
      {
        headers: this._authService.getSuperAdminHeaders(),
      }
    );
  }

  /**
   * Reactivate subscription (SuperAdmin only)
   */
  reactivateSubscription(
    tenantId: string,
    endDate?: string
  ): Observable<{ message: string; subscription: Subscription }> {
    return this._http.post<{ message: string; subscription: Subscription }>(
      `${this._apiUrl}/api/superadmin/subscriptions/${tenantId}/reactivate`,
      { endDate },
      {
        headers: this._authService.getSuperAdminHeaders(),
      }
    );
  }

  /**
   * Get subscription analytics (SuperAdmin only)
   */
  getSubscriptionAnalytics(): Observable<SubscriptionAnalytics> {
    return this._http.get<SubscriptionAnalytics>(`${this._apiUrl}/api/superadmin/subscriptions/analytics`, {
      headers: this._authService.getSuperAdminHeaders(),
    });
  }

  /**
   * Get expiring subscriptions (SuperAdmin only)
   */
  getExpiringSubscriptions(days = 7): Observable<{ subscriptions: Subscription[]; count: number }> {
    return this._http.get<{ subscriptions: Subscription[]; count: number }>(
      `${this._apiUrl}/api/superadmin/subscriptions/expiring?days=${days}`,
      {
        headers: this._authService.getSuperAdminHeaders(),
      }
    );
  }

  /**
   * Suggest plan for tenant (SuperAdmin only)
   */
  suggestPlan(tenantId: string): Observable<PlanSuggestion> {
    return this._http.get<PlanSuggestion>(`${this._apiUrl}/api/superadmin/subscriptions/${tenantId}/suggest`, {
      headers: this._authService.getSuperAdminHeaders(),
    });
  }

  // ============================================
  // TENANT SUBSCRIPTION (ADMIN VIEW)
  // ============================================

  /**
   * Get current tenant's subscription (Admin view - their own subscription)
   */
  getMySubscription(): Observable<SubscriptionDetails> {
    this.isLoading.set(true);

    return this._http
      .get<SubscriptionDetails>(`${this._apiUrl}/api/subscription`)
      .pipe(
        tap({
          next: (details) => {
            this._currentSubscriptionSubject.next(details);
            this.isLoading.set(false);
            this.error.set(null);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.error.set(error.message || 'Failed to load subscription');
          },
        })
      );
  }

  /**
   * Get available plans for upgrade (Tenant Admin view)
   */
  getAvailablePlans(): Observable<PricingPlansResponse> {
    // Use tenant-specific endpoint instead of superadmin endpoint
    this.isLoading.set(true);
    return this._http
      .get<PricingPlansResponse>(`${this._apiUrl}/api/subscription/plans`)
      .pipe(
        tap({
          next: (response) => {
            this._pricingPlansSubject.next(response.plans);
            this._addonsSubject.next(response.addons);
            this.isLoading.set(false);
            this.error.set(null);
          },
          error: (error) => {
            this.isLoading.set(false);
            this.error.set(error.message || 'Failed to load pricing plans');
          },
        })
      );
  }

  /**
   * Calculate custom price for tenant admin
   */
  calculateCustomPriceForTenant(
    tables: number,
    waiters: number,
    printers = 0
  ): Observable<CustomPlanCalculation> {
    return this._http.post<CustomPlanCalculation>(
      `${this._apiUrl}/api/subscription/calculate`,
      { tables, waiters, printers }
    );
  }

  /**
   * Request subscription upgrade (for tenant admin to request, superadmin to approve)
   */
  requestUpgrade(
    plan: string,
    tables?: number,
    waiters?: number,
    printers?: number,
    notes?: string
  ): Observable<{ message: string; requestDetails: any }> {
    return this._http.post<{ message: string; requestDetails: any }>(
      `${this._apiUrl}/api/subscription/upgrade-request`,
      { plan, tables, waiters, printers, notes }
    );
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Clear current subscription
   */
  clearCurrentSubscription(): void {
    this._currentSubscriptionSubject.next(null);
  }

  /**
   * Refresh current subscription
   */
  refreshCurrentSubscription(): void {
    const user = this._authService.currentUser();
    if (user?.tenantId) {
      this.getSubscriptionDetails(user.tenantId).subscribe();
    }
  }

  /**
   * Get tenant invoices
   */
  getMyInvoices(): Observable<{ invoices: any[]; count: number }> {
    return this._http.get<{ invoices: any[]; count: number }>(
      `${this._apiUrl}/api/invoices`
    );
  }

  /**
   * Get tenant payment history
   */
  getMyPayments(): Observable<{ payments: any[]; count: number }> {
    return this._http.get<{ payments: any[]; count: number }>(
      `${this._apiUrl}/api/invoices/payments`
    );
  }

  /**
   * Download invoice
   */
  downloadInvoice(invoiceId: string): Observable<any> {
    return this._http.get(
      `${this._apiUrl}/api/invoices/${invoiceId}/download`
    );
  }
}

