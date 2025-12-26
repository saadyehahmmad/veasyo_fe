import { Component, Inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { SubscriptionDetails, PricingPlan, SubscriptionHelper } from '../../../../models/subscription.model';

interface DialogData {
  currentSubscription: SubscriptionDetails;
  availablePlans: PricingPlan[];
}

@Component({
  selector: 'app-upgrade-plan-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatDividerModule,
  ],
  templateUrl: './upgrade-plan-dialog.component.html',
  styleUrls: ['./upgrade-plan-dialog.component.scss'],
})
export class UpgradePlanDialogComponent {
  selectedPlan = signal<PricingPlan | null>(null);
  helper = SubscriptionHelper;

  constructor(
    public dialogRef: MatDialogRef<UpgradePlanDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData
  ) {}

  selectPlan(plan: PricingPlan): void {
    this.selectedPlan.set(plan);
  }

  isCurrentPlan(plan: PricingPlan): boolean {
    return plan.id === this.data.currentSubscription.subscription.plan;
  }

  canSelectPlan(plan: PricingPlan): boolean {
    const currentPlan = this.data.currentSubscription.subscription.plan;
    const planOrder = ['free', 'basic', 'standard', 'premium', 'custom'];
    const currentIndex = planOrder.indexOf(currentPlan);
    const planIndex = planOrder.indexOf(plan.id);
    return planIndex > currentIndex;
  }

  onUpgrade(): void {
    if (this.selectedPlan()) {
      // In a real implementation, this would call the API to upgrade
      // For now, we'll just close with the selected plan
      this.dialogRef.close(this.selectedPlan());
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

