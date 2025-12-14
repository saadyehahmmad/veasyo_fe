import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { Subject, takeUntil, interval } from 'rxjs';
import { SuperAdminService, PlatformAnalytics } from '../../../services/superadmin.service';
import { LoggerService } from '../../../services/logger.service';

interface ChartData {
  label: string;
  value: number;
  percentage: number;
  color: string;
}


@Component({
  selector: 'app-superadmin-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatChipsModule,
    MatTableModule,
  ],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss'],
})
export class SuperAdminAnalyticsDashboardComponent implements OnInit, OnDestroy {
  private _superAdminService = inject(SuperAdminService);
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggerService);
  private _destroy$ = new Subject<void>();

  analytics = signal<PlatformAnalytics | null>(null);
  isLoading = signal(false);
  lastUpdated = signal<Date>(new Date());
  autoRefresh = signal(false);

  // Computed data for charts
  tenantStatusData = signal<ChartData[]>([]);
  userRoleData = signal<ChartData[]>([]);
  requestStatusData = signal<ChartData[]>([]);
  subscriptionStatusData = signal<ChartData[]>([]);

  // Tenant analytics data
  displayedColumns = ['tenantName', 'totalRequests', 'pendingRequests', 'completedRequests', 'avgResponseTime', 'avgCompletionTime'];

  ngOnInit(): void {
    this._loadAnalytics();
    this._setupAutoRefresh();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _setupAutoRefresh(): void {
    interval(60000) // Refresh every 60 seconds
      .pipe(takeUntil(this._destroy$))
      .subscribe(() => {
        if (this.autoRefresh()) {
          this._loadAnalytics(true);
        }
      });
  }

  private _loadAnalytics(silent = false): void {
    if (!silent) {
      this.isLoading.set(true);
    }

    this._superAdminService
      .getPlatformAnalytics()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (analytics: PlatformAnalytics) => {
          this.analytics.set(analytics);
          this._processAnalyticsData(analytics);
          this.lastUpdated.set(new Date());
          this.isLoading.set(false);
        },
        error: (error: Error) => {
          this._logger.error('Failed to load analytics:', error);
          this._showError('Failed to load analytics data');
          this.isLoading.set(false);
        },
      });
  }

  private _processAnalyticsData(analytics: PlatformAnalytics): void {
    // Process tenant status data
    const tenantTotal = analytics.platform.tenants.total || 1;
    this.tenantStatusData.set([
      {
        label: 'Active',
        value: analytics.platform.tenants.active,
        percentage: (analytics.platform.tenants.active / tenantTotal) * 100,
        color: '#4caf50',
      },
      {
        label: 'Inactive',
        value: analytics.platform.tenants.inactive,
        percentage: (analytics.platform.tenants.inactive / tenantTotal) * 100,
        color: '#f44336',
      },
    ]);

    // Process user role data
    const userTotal = analytics.platform.users.total || 1;
    this.userRoleData.set([
      {
        label: 'Admins',
        value: analytics.platform.users.admins,
        percentage: (analytics.platform.users.admins / userTotal) * 100,
        color: '#9c27b0',
      },
      {
        label: 'Waiters',
        value: analytics.platform.users.waiters,
        percentage: (analytics.platform.users.waiters / userTotal) * 100,
        color: '#2196f3',
      },
      {
        label: 'Others',
        value: userTotal - analytics.platform.users.admins - analytics.platform.users.waiters,
        percentage:
          ((userTotal - analytics.platform.users.admins - analytics.platform.users.waiters) /
            userTotal) *
          100,
        color: '#9e9e9e',
      },
    ]);

    // Process request status data
    const requestTotal = analytics.platform.requests.total || 1;
    this.requestStatusData.set([
      {
        label: 'Pending',
        value: analytics.platform.requests.pending,
        percentage: (analytics.platform.requests.pending / requestTotal) * 100,
        color: '#ff9800',
      },
      {
        label: 'Completed',
        value: analytics.platform.requests.completed,
        percentage: (analytics.platform.requests.completed / requestTotal) * 100,
        color: '#4caf50',
      },
    ]);

    // Process subscription status data
    const subscriptionTotal = analytics.subscriptions.total || 1;
    this.subscriptionStatusData.set([
      {
        label: 'Active',
        value: analytics.subscriptions.active,
        percentage: (analytics.subscriptions.active / subscriptionTotal) * 100,
        color: '#4caf50',
      },
      {
        label: 'Expired',
        value: analytics.subscriptions.expired,
        percentage: (analytics.subscriptions.expired / subscriptionTotal) * 100,
        color: '#f44336',
      },
    ]);
  }

  toggleAutoRefresh(): void {
    this.autoRefresh.set(!this.autoRefresh());
    const message = this.autoRefresh()
      ? 'Auto-refresh enabled (every 60s)'
      : 'Auto-refresh disabled';
    this._showSuccess(message);
  }

  refreshData(): void {
    this._loadAnalytics();
  }

  getHealthStatus(): { status: string; color: string; icon: string } {
    const analytics = this.analytics();
    if (!analytics) {
      return { status: 'Unknown', color: '#9e9e9e', icon: 'help' };
    }

    const activePercentage =
      (analytics.platform.tenants.active / analytics.platform.tenants.total) * 100;

    if (activePercentage >= 90) {
      return { status: 'Excellent', color: '#4caf50', icon: 'check_circle' };
    } else if (activePercentage >= 70) {
      return { status: 'Good', color: '#8bc34a', icon: 'check_circle' };
    } else if (activePercentage >= 50) {
      return { status: 'Fair', color: '#ff9800', icon: 'warning' };
    } else {
      return { status: 'Poor', color: '#f44336', icon: 'error' };
    }
  }

  getCompletionRate(): number {
    const analytics = this.analytics();
    if (!analytics || analytics.platform.requests.total === 0) return 0;
    return (analytics.platform.requests.completed / analytics.platform.requests.total) * 100;
  }

  getActiveRate(): number {
    const analytics = this.analytics();
    if (!analytics || analytics.platform.users.total === 0) return 0;
    return (analytics.platform.users.active / analytics.platform.users.total) * 100;
  }

  formatLastUpdated(): string {
    const now = new Date();
    const diff = now.getTime() - this.lastUpdated().getTime();
    const seconds = Math.floor(diff / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }

  private _showSuccess(message: string): void {
    this._snackBar.open(message, 'Close', {
      duration: 3000,
      panelClass: ['success-snack'],
    });
  }

  private _showError(message: string): void {
    this._snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: ['error-snack'],
    });
  }

  getTenantAnalyticsData() {
    return this.analytics()?.tenantAnalytics?.filter(ta => ta.analytics !== null) || [];
  }

  formatTime(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}
