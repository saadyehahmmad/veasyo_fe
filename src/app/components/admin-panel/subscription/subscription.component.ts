import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { SubscriptionService } from '../../../services/subscription.service';
import { AuthService } from '../../../services/auth.service';
import {
  SubscriptionDetails,
  SubscriptionHelper,
  PricingPlan,
} from '../../../models/subscription.model';
import { UpgradePlanDialogComponent } from './upgrade-plan-dialog/upgrade-plan-dialog.component';
import { InvoiceHistoryComponent } from './invoice-history/invoice-history.component';

@Component({
  selector: 'app-subscription',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressBarModule,
    MatDividerModule,
    MatDialogModule,
    MatTooltipModule,
    MatTabsModule,
    TranslateModule,
    InvoiceHistoryComponent,
  ],
  templateUrl: './subscription.component.html',
  styleUrls: ['./subscription.component.scss'],
})
export class SubscriptionComponent implements OnInit, OnDestroy {
  private _subscriptionService = inject(SubscriptionService);
  private _authService = inject(AuthService);
  private _dialog = inject(MatDialog);
  private _destroy$ = new Subject<void>();

  subscriptionDetails = signal<SubscriptionDetails | null>(null);
  availablePlans = signal<PricingPlan[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Helper for template
  helper = SubscriptionHelper;

  ngOnInit(): void {
    this.loadSubscription();
    this.loadAvailablePlans();
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  loadSubscription(): void {
    this.isLoading.set(true);
    this._subscriptionService
      .getMySubscription()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (details) => {
          this.subscriptionDetails.set(details);
          this.isLoading.set(false);
          this.error.set(null);
        },
        error: (err) => {
          console.error('Error loading subscription:', err);
          this.error.set('Failed to load subscription details');
          this.isLoading.set(false);
        },
      });
  }

  loadAvailablePlans(): void {
    this._subscriptionService
      .getAvailablePlans()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (response) => {
          this.availablePlans.set(response.plans);
        },
        error: (err) => {
          console.error('Error loading plans:', err);
        },
      });
  }

  openUpgradeDialog(): void {
    const dialogRef = this._dialog.open(UpgradePlanDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      data: {
        currentSubscription: this.subscriptionDetails(),
        availablePlans: this.availablePlans(),
      },
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        // Refresh subscription after upgrade
        this.loadSubscription();
      }
    });
  }

  getUsagePercentage(current: number, max: number): number {
    return max > 0 ? (current / max) * 100 : 0;
  }

  getUsageColor(percentage: number): string {
    if (percentage >= 90) return 'warn';
    if (percentage >= 75) return 'accent';
    return 'primary';
  }

  getDaysUntilExpiration(): number {
    const details = this.subscriptionDetails();
    if (!details?.subscription.endDate) return 0;
    return SubscriptionHelper.daysUntilExpiration(details.subscription.endDate);
  }

  isExpiringSoon(): boolean {
    const details = this.subscriptionDetails();
    if (!details?.subscription.endDate) return false;
    return SubscriptionHelper.isExpiringSoon(details.subscription.endDate);
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatPrice(fils: number | null | undefined): string {
    if (!fils) return '0.00 USD';
    const usd = SubscriptionHelper.centsToUsd(fils);
    return SubscriptionHelper.formatPrice(usd, 'USD');
  }

  getPlanName(plan: string): string {
    return SubscriptionHelper.getPlanDisplayName(plan);
  }

  getStatusColor(status: string): string {
    return SubscriptionHelper.getStatusColor(status);
  }

  getStatusIcon(status: string): string {
    return SubscriptionHelper.getStatusIcon(status);
  }

  canUpgrade(): boolean {
    const details = this.subscriptionDetails();
    if (!details) return false;
    return details.subscription.status === 'active' && details.subscription.plan !== 'premium';
  }

  hasWarnings(): boolean {
    const details = this.subscriptionDetails();
    return (details?.validation.warnings.length || 0) > 0;
  }

  hasErrors(): boolean {
    const details = this.subscriptionDetails();
    return (details?.validation.errors.length || 0) > 0;
  }
}

