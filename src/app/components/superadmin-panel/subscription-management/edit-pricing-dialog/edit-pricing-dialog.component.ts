import { Component, Inject, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { SuperAdminService } from '../../../../services/superadmin.service';

@Component({
  selector: 'app-edit-pricing-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>attach_money</mat-icon>
      {{ 'admin.superadmin.editPricing.title' | translate }}
    </h2>

    <mat-dialog-content>
      <form [formGroup]="pricingForm">
        <div class="tenant-info">
          <p><strong>{{ data.tenant.name }}</strong></p>
          <p class="subdomain">{{ data.tenant.subdomain }}</p>
        </div>

        <div class="info-banner">
          <mat-icon>info</mat-icon>
          <p>
            <strong>Note:</strong> Price changes will only apply to <strong>future payments</strong>. 
            Previous invoices and payments remain unchanged.
          </p>
        </div>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'admin.superadmin.editPricing.totalAmount' | translate }}</mat-label>
          <input matInput type="number" formControlName="amount" [placeholder]="'e.g., 75.00'" step="0.01" />
          <span matPrefix>$&nbsp;</span>
          <mat-hint>Monthly subscription amount in USD (applies from next billing cycle)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'admin.superadmin.editPricing.basePrice' | translate }}</mat-label>
          <input matInput type="number" formControlName="basePrice" step="0.01" />
          <span matPrefix>$&nbsp;</span>
          <mat-hint>Base plan price (for reference)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'admin.superadmin.editPricing.addonsCost' | translate }}</mat-label>
          <input matInput type="number" formControlName="addonsCost" step="0.01" />
          <span matPrefix>$&nbsp;</span>
          <mat-hint>Add-ons cost (for reference)</mat-hint>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>{{ 'admin.superadmin.tenantManagement.notes' | translate }}</mat-label>
          <textarea
            matInput
            formControlName="notes"
            rows="3"
            [placeholder]="'admin.superadmin.tenantManagement.internalNotes' | translate"
          ></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">
        {{ 'admin.superadmin.tenantManagement.cancel' | translate }}
      </button>
      <button
        mat-raised-button
        color="primary"
        (click)="onSave()"
        [disabled]="!pricingForm.valid || isSaving()"
      >
        @if (isSaving()) {
          <mat-icon>hourglass_empty</mat-icon>
        }
        {{ 'admin.superadmin.tenantManagement.save' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      padding: 24px;

      .tenant-info {
        margin-bottom: 24px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;

        p {
          margin: 4px 0;
        }

        .subdomain {
          font-size: 14px;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      form {
        display: flex;
        flex-direction: column;
        gap: 16px;

        mat-form-field {
          width: 100%;
        }
      }

      .info-banner {
        display: flex;
        align-items: flex-start;
        gap: 12px;
        padding: 16px;
        background-color: #e3f2fd;
        border-left: 4px solid #2196f3;
        border-radius: 4px;
        margin-bottom: 8px;

        mat-icon {
          color: #2196f3;
          flex-shrink: 0;
        }

        p {
          margin: 0;
          color: #1565c0;
          font-size: 14px;
          line-height: 1.5;

          strong {
            font-weight: 600;
          }
        }
      }
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  `],
})
export class EditPricingDialogComponent {
  private _fb = inject(FormBuilder);
  private _superAdminService = inject(SuperAdminService);
  private _snackBar = inject(MatSnackBar);

  pricingForm: FormGroup;
  isSaving = signal(false);

  constructor(
    public dialogRef: MatDialogRef<EditPricingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {
    // Convert from cents to USD for display
    const amountUSD = (data.subscription.amount || 0) / 100;
    const basePriceUSD = (data.subscription.basePrice || 0) / 100;
    const addonsCostUSD = (data.subscription.addonsCost || 0) / 100;

    this.pricingForm = this._fb.group({
      amount: [amountUSD, [Validators.required, Validators.min(0)]],
      basePrice: [basePriceUSD, [Validators.min(0)]],
      addonsCost: [addonsCostUSD, [Validators.min(0)]],
      notes: [data.subscription.notes || ''],
    });
  }

  onSave(): void {
    if (!this.pricingForm.valid) return;

    this.isSaving.set(true);
    const formValue = this.pricingForm.value;

    // Convert USD to cents for storage
    const pricingData = {
      amount: Math.round(formValue.amount * 100),
      basePrice: Math.round(formValue.basePrice * 100),
      addonsCost: Math.round(formValue.addonsCost * 100),
      notes: formValue.notes,
    };

    this._superAdminService
      .updateSubscriptionPricing(this.data.tenant.id, pricingData)
      .subscribe({
        next: (response) => {
          const message = response?.message || 'Pricing updated successfully. New price will apply from the next billing cycle.';
          this._snackBar.open(message, 'Close', {
            duration: 5000,
            panelClass: ['success-snackbar'],
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error updating pricing:', error);
          const errorMessage = error?.error?.message || 'Failed to update pricing';
          this._snackBar.open(errorMessage, 'Close', {
            duration: 5000,
            panelClass: ['error-snackbar'],
          });
          this.isSaving.set(false);
        },
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

