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
import { Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { TenantManagementComponent } from './tenant-management/tenant-management.component';
import { SuperadminUsersComponent } from './superadmin-users/superadmin-users.component';
import { SuperAdminAnalyticsDashboardComponent } from './analytics-dashboard/analytics-dashboard.component';
import { MonitoringComponent } from './monitoring/monitoring.component';
import { AuthService } from '../../services/auth.service';
import { SuperAdminService } from '../../services/superadmin.service';
import { LoggerService } from '../../services/logger.service';

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
    TenantManagementComponent,
    SuperadminUsersComponent,
    SuperAdminAnalyticsDashboardComponent,
    MonitoringComponent,
  ],
  templateUrl: './superadmin-panel.component.html',
  styleUrls: ['./superadmin-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SuperAdminPanelComponent implements OnInit, OnDestroy {
  private _authService = inject(AuthService);
  private _superAdminService = inject(SuperAdminService);
  private _router = inject(Router);
  private _logger = inject(LoggerService);
  private _destroy$ = new Subject<void>();

  currentUser = signal<any>(null);
  analytics = signal<any>(null);
  isLoading = signal(false);

  // Dynamic tabs configuration
  tabs = signal<AdminTab[]>([
    {
      label: 'Tenants',
      icon: 'business',
      component: TenantManagementComponent,
      roles: ['superadmin'],
    },
    {
      label: 'Users',
      icon: 'group',
      component: SuperadminUsersComponent,
      roles: ['superadmin'],
    },
    {
      label: 'Analytics',
      icon: 'analytics',
      component: SuperAdminAnalyticsDashboardComponent,
      roles: ['superadmin'],
    },
    {
      label: 'Monitoring',
      icon: 'monitoring',
      component: MonitoringComponent,
      roles: ['superadmin'],
    },
  ]);

  // Filtered tabs based on user role
  visibleTabs = signal<AdminTab[]>([]);

  // UI state
  sidebarCollapsed = signal<boolean>(false);
  selectedTab = signal<string>('Tenants');

  private _tabSubtitles: Record<string, string> = {
    Tenants: 'Manage system tenants and subscriptions',
    Users: 'Manage system-wide users and permissions',
    Analytics: 'Platform-wide performance metrics and insights',
    Monitoring: 'System health, database pool, Socket.IO, and system metrics',
    'Audit Logs': 'Track all administrative actions and changes',
    Tables: 'Global table management view',
    'Service Requests': 'Monitor all service requests across tenants',
  };

  ngOnInit(): void {
    this._checkSuperAdminAccess();
    this._loadCurrentUser();
    this._loadAnalytics();
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

  toggleSidebar(): void {
    this.sidebarCollapsed.set(!this.sidebarCollapsed());
  }

  selectTab(tabLabel: string): void {
    this.selectedTab.set(tabLabel);
  }

  getTabSubtitle(): string {
    return this._tabSubtitles[this.selectedTab()] || '';
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
    // Refresh data in child components
    // This could be improved by using a shared service or event system
  }

  getAnalyticsSummary(): string {
    const analytics = this.analytics();
    if (!analytics) return 'Loading...';

    return `${analytics.tenants?.total || 0} tenants, ${analytics.users?.total || 0} users, ${analytics.requests?.total || 0} requests`;
  }
}
