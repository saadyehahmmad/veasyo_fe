import { Component, Inject, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SubscriptionService } from '../../../../services/subscription.service';
import { SuperAdminService } from '../../../../services/superadmin.service';
import {
  UpdateSubscriptionRequest,
  CreateSubscriptionRequest,
} from '../../../../models/subscription.model';

@Component({
  selector: 'app-manage-subscription-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './manage-subscription-dialog.component.html',
  styleUrls: ['./manage-subscription-dialog.component.scss'],
})
export class ManageSubscriptionDialogComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _subscriptionService = inject(SubscriptionService);
  private _superAdminService = inject(SuperAdminService);
  private _snackBar = inject(MatSnackBar);
  private _dialogRef = inject(MatDialogRef<ManageSubscriptionDialogComponent>);

  subscriptionForm: FormGroup;
  plans: ('free' | 'basic' | 'standard' | 'premium' | 'custom')[] = ['free', 'basic', 'standard', 'premium', 'custom'];
  isLoading = signal(false);
  isEditMode = false;

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: { tenant: any; subscription?: any; isEdit?: boolean; mode?: 'create' | 'edit' }
  ) {
    this.isEditMode = data.mode === 'edit' || data.isEdit || false;

    // Use subscription data as defaults - handle different data structures
    const subscription = data.subscription || data.tenant?.subscription;
    
    const defaultTables = subscription?.maxTables || 10;
    const defaultUsers = subscription?.maxUsers || 5;
    
    // Get default price and tax - convert from cents to USD
    const defaultPrice = subscription?.amount ? subscription.amount / 100 : 0;
    const defaultTax = subscription?.tax ? subscription.tax / 100 : 0;

    const initialPlan = subscription?.plan || 'basic';
    const startDate = subscription?.startDate ? new Date(subscription.startDate) : new Date();
    const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;

    this.subscriptionForm = this._fb.group({
      plan: [initialPlan, Validators.required],
      startDate: [startDate, Validators.required],
      endDate: [endDate, Validators.required],
      amount: [defaultPrice, [Validators.required, Validators.min(0)]],
      tax: [defaultTax, [Validators.min(0)]],
      maxTables: [defaultTables, [Validators.required, Validators.min(1)]],
      maxUsers: [defaultUsers, [Validators.required, Validators.min(1)]],
      notes: [subscription?.notes || ''],
    });

    // Custom validator: end date must be after start date
    this.subscriptionForm.get('endDate')?.setValidators([
      Validators.required,
      () => {
        const start = this.subscriptionForm.get('startDate')?.value;
        const end = this.subscriptionForm.get('endDate')?.value;
        if (start && end && end <= start) {
          return { endDateBeforeStart: true };
        }
        return null;
      },
    ]);

  }

  ngOnInit(): void {
    // No need to load plans - they're just labels now
  }

  save(): void {
    if (this.subscriptionForm.invalid) {
      Object.keys(this.subscriptionForm.controls).forEach((key) => {
        this.subscriptionForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);
    const formValue = this.subscriptionForm.value;
    const tenantId = this.data.tenant?.tenant?.id || this.data.tenant?.id;

    if (this.isEditMode) {
      // Update mode
      const updateRequest: UpdateSubscriptionRequest = {
        plan: formValue.plan,
        startDate: formValue.startDate.toISOString(),
        endDate: formValue.endDate.toISOString(),
        amount: formValue.amount, // Will be converted to cents in service
        tax: formValue.tax || 0, // Will be converted to cents in service
        maxTables: formValue.maxTables,
        maxUsers: formValue.maxUsers,
      };

      this._superAdminService.updateTenantSubscription(tenantId, updateRequest).subscribe({
          next: (response) => {
            this.isLoading.set(false);
            this._snackBar.open('Subscription updated successfully', 'Close', { duration: 3000 });
            this._dialogRef.close(response.subscription);
          },
          error: (error) => {
            this.isLoading.set(false);
            this._snackBar.open(
              `Failed to update subscription: ${error.error?.message || error.message}`,
              'Close',
              { duration: 5000 }
            );
          },
        });
    } else {
      // Create mode
      const createRequest: CreateSubscriptionRequest = {
        tenantId,
        plan: formValue.plan,
        startDate: formValue.startDate.toISOString(),
        endDate: formValue.endDate.toISOString(),
        amount: formValue.amount, // Will be converted to cents in service
        tax: formValue.tax || 0, // Will be converted to cents in service
        maxTables: formValue.maxTables,
        maxUsers: formValue.maxUsers,
      };

      this._superAdminService.createTenantSubscription(createRequest).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this._snackBar.open('Subscription created successfully', 'Close', { duration: 3000 });
          this._dialogRef.close(response.subscription);
        },
        error: (error) => {
          this.isLoading.set(false);
          this._snackBar.open(
            `Failed to create subscription: ${error.error?.message || error.message}`,
            'Close',
            { duration: 5000 }
          );
        },
      });
    }
  }

  cancel(): void {
    this._dialogRef.close();
  }
}

