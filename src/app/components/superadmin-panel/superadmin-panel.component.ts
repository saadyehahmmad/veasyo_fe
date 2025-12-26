import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  ChangeDetectionStrategy,
  Type,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TenantManagementComponent } from './tenant-management/tenant-management.component';
import { SuperadminUsersComponent } from './superadmin-users/superadmin-users.component';
import { SuperAdminAnalyticsDashboardComponent } from './analytics-dashboard/analytics-dashboard.component';
import { MonitoringComponent } from './monitoring/monitoring.component';
import { SuperadminSubscriptionManagementComponent } from './subscription-management/subscription-management.component';
import { ChangeLanguageComponent } from '../../shared/change-language/change-language.component';
import { AuthService } from '../../services/auth.service';
import { SuperAdminService } from '../../services/superadmin.service';
import { LoggerService } from '../../services/logger.service';
import { SubscriptionService } from '../../services/subscription.service';

interface AdminTab {
  label: string;
  icon: string;
  component: Type<any>;
  roles?: string[];
}

@Component({
  selector: 'app-superadmin-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatTooltipModule,
    TranslateModule,
    TenantManagementComponent,
    SuperadminUsersComponent,
    SuperAdminAnalyticsDashboardComponent,
    MonitoringComponent,
    SuperadminSubscriptionManagementComponent,
    ChangeLanguageComponent,
  ],
  templateUrl: './superadmin-panel.component.html',
  styleUrls: ['./superadmin-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminPanelComponent implements OnInit, OnDestroy {
  private _authService = inject(AuthService);
  private _superAdminService = inject(SuperAdminService);
  private _subscriptionService = inject(SubscriptionService);
  private _translate = inject(TranslateService);
  private _router = inject(Router);
  private _logger = inject(LoggerService);
  private _destroy$ = new Subject<void>();

  currentUser = signal<any>(null);
  analytics = signal<any>(null);
  subscriptionAnalytics = signal<any>(null);
  expiringSubscriptions = signal<any[]>([]);
  isLoading = signal(false);

  // Dynamic tabs configuration
  tabs = signal<AdminTab[]>([
    {
      label: 'admin.superadmin.tabs.tenants',
      icon: 'business',
      component: TenantManagementComponent,
      roles: ['superadmin'],
    },
    {
      label: 'admin.superadmin.tabs.users',
      icon: 'group',
      component: SuperadminUsersComponent,
      roles: ['superadmin'],
    },
    {
      label: 'admin.superadmin.tabs.subscriptions',
      icon: 'workspace_premium',
      component: SuperadminSubscriptionManagementComponent,
      roles: ['superadmin'],
    },
    {
      label: 'admin.superadmin.tabs.analytics',
      icon: 'analytics',
      component: SuperAdminAnalyticsDashboardComponent,
      roles: ['superadmin'],
    },
    {
      label: 'admin.superadmin.tabs.monitoring',
      icon: 'monitoring',
      component: MonitoringComponent,
      roles: ['superadmin'],
    },
  ]);

  // Filtered tabs based on user role
  visibleTabs = signal<AdminTab[]>([]);

  // UI state
  sidebarCollapsed = signal<boolean>(false);
  selectedTab = signal<string>('admin.superadmin.tabs.tenants');

  ngOnInit(): void {
    this._checkSuperAdminAccess();
    this._loadCurrentUser();
    this._loadAnalytics();
    this._loadSubscriptionAnalytics();
    this._loadExpiringSubscriptions();
    this._filterTabsByRole();

    // Set first visible tab as default
    const firstTab = this.visibleTabs()[0];
    if (firstTab) {
      this.selectedTab.set(firstTab.label);
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _checkSuperAdminAccess(): void {
    if (!this._superAdminService.isSuperAdmin()) {
      this._logger.warn('Unauthorized access to SuperAdmin panel');
      this._router.navigate(['/']);
    }
  }

  private _loadCurrentUser(): void {
    this._authService.currentUser$.pipe(takeUntil(this._destroy$)).subscribe((user) => {
      this.currentUser.set(user);
    });
  }

  private _loadAnalytics(): void {
    this.isLoading.set(true);
    this._superAdminService
      .getPlatformAnalytics()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (analytics) => {
          this.analytics.set(analytics);
          this.isLoading.set(false);
        },
        error: (error) => {
          this._logger.error('Failed to load analytics:', error);
          this.isLoading.set(false);
        },
      });
  }

  private _filterTabsByRole(): void {
    const user = this.currentUser();
    const userRole = user?.role || 'superadmin';
    const filtered = this.tabs().filter(
      (tab) => !tab.roles || tab.roles.length === 0 || tab.roles.includes(userRole),
    );
    this.visibleTabs.set(filtered);
  }

  private _loadSubscriptionAnalytics(): void {
    this._superAdminService
      .getSubscriptionAnalytics()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (analytics: any) => {
          this.subscriptionAnalytics.set(analytics);
        },
        error: (error: any) => {
          this._logger.error('Failed to load subscription analytics:', error);
        },
      });
  }

  private _loadExpiringSubscriptions(): void {
    this._superAdminService
      .getExpiringSubscriptions(7)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (response: any) => {
          this.expiringSubscriptions.set(response.subscriptions || []);
        },
        error: (error: any) => {
          this._logger.error('Failed to load expiring subscriptions:', error);
        },
      });
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  selectTab(tabLabel: string): void {
    this.selectedTab.set(tabLabel);
  }

  getTabSubtitle(): string {
    // Extract the last part of the key (e.g., 'tenants' from 'admin.superadmin.tabs.tenants')
    const tabKey = this.selectedTab().split('.').pop();
    const key = `admin.superadmin.tabs.subtitle.${tabKey}`;
    return this._translate.instant(key);
  }

  updateTabs(newTabs: AdminTab[]): void {
    this.tabs.set(newTabs);
    this._filterTabsByRole();
  }

  logout(): void {
    this._authService.logout();
    this._router.navigate(['/login']);
  }

  refreshData(): void {
    this._loadAnalytics();
    this._loadSubscriptionAnalytics();
    this._loadExpiringSubscriptions();
  }

  getAnalyticsSummary(): string {
    const analytics = this.analytics();
    if (!analytics) return this._translate.instant('admin.superadmin.loading');

    return this._translate.instant('admin.superadmin.analyticsSummary', {
      tenants: analytics.tenants?.total || 0,
      users: analytics.users?.total || 0,
      requests: analytics.requests?.total || 0,
    });
  }

  getSubscriptionSummary(): string {
    const analytics = this.subscriptionAnalytics();
    if (!analytics) return '';

    return this._translate.instant('admin.superadmin.subscriptionSummary', {
      active: analytics.activeSubscriptions || 0,
      revenue: analytics.totalMonthlyRevenue || 0,
    });
  }

  getExpiringCount(): number {
    return this.expiringSubscriptions().length;
  }
}
