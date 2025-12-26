import { Component, Inject, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { TranslateModule } from '@ngx-translate/core';
import { SuperAdminService } from '../../../../services/superadmin.service';
import { Subscription, CreateSubscriptionRequest, UpdateSubscriptionRequest } from '../../../../models/subscription.model';
import { Observable, map, startWith } from 'rxjs';

interface TenantOption {
  id: string;
  name: string;
  subdomain: string | null;
}

@Component({
  selector: 'app-subscription-dialog',
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
    MatAutocompleteModule,
    TranslateModule,
  ],
  templateUrl: './subscription-dialog.component.html',
  styleUrls: ['./subscription-dialog.component.scss'],
})
export class SubscriptionDialogComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _superAdminService = inject(SuperAdminService);
  private _snackBar = inject(MatSnackBar);
  private _dialogRef = inject(MatDialogRef<SubscriptionDialogComponent>);

  subscriptionForm: FormGroup;
  tenants = signal<TenantOption[]>([]);
  filteredTenants$!: Observable<TenantOption[]>;
  isLoading = signal(false);
  isEditMode = false;

  plans: ('free' | 'basic' | 'standard' | 'premium' | 'custom')[] = ['free', 'basic', 'standard', 'premium', 'custom'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { mode: 'create' | 'edit'; subscription?: Subscription }
  ) {
    this.isEditMode = data.mode === 'edit';

    const subscription = data.subscription;
    const startDate = subscription?.startDate ? new Date(subscription.startDate) : new Date();
    const endDate = subscription?.endDate ? new Date(subscription.endDate) : null;

    this.subscriptionForm = this._fb.group({
      tenantId: [subscription?.tenantId || '', Validators.required],
      plan: [subscription?.plan || 'basic', Validators.required],
      startDate: [startDate, Validators.required],
      endDate: [endDate, Validators.required],
      amount: [subscription?.amount ? subscription.amount / 100 : 0, [Validators.required, Validators.min(0)]],
      tax: [subscription?.tax ? subscription.tax / 100 : 0, [Validators.min(0)]],
      maxTables: [subscription?.maxTables || 10, [Validators.required, Validators.min(1)]],
      maxUsers: [subscription?.maxUsers || 5, [Validators.required, Validators.min(1)]],
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
    this.loadTenants();
    this.setupTenantAutocomplete();
  }

  loadTenants(): void {
    this._superAdminService.getAllTenants().subscribe({
      next: (tenants) => {
        const tenantOptions: TenantOption[] = tenants.map(t => ({
          id: t.tenant?.id || '',
          name: t.tenant?.name || '',
          subdomain: t.tenant?.subdomain || null,
        })).filter(t => t.id); // Filter out any invalid entries
        this.tenants.set(tenantOptions);
      },
      error: (error) => {
        console.error('Failed to load tenants:', error);
        this._snackBar.open('Failed to load tenants', 'Close', { duration: 3000 });
      },
    });
  }

  setupTenantAutocomplete(): void {
    const tenantControl = this.subscriptionForm.get('tenantId');
    if (!tenantControl) return;
    
    this.filteredTenants$ = tenantControl.valueChanges.pipe(
      startWith(''),
      map(value => {
        const name = typeof value === 'string' ? value : value?.name || '';
        return name ? this._filterTenants(name) : this.tenants().slice();
      })
    );
  }

  private _filterTenants(name: string): TenantOption[] {
    const filterValue = name.toLowerCase();
    return this.tenants().filter(tenant =>
      tenant.name.toLowerCase().includes(filterValue) ||
      tenant.subdomain?.toLowerCase().includes(filterValue)
    );
  }

  displayTenantFn(tenant: TenantOption): string {
    return tenant ? `${tenant.name} (${tenant.subdomain})` : '';
  }

  onSave(): void {
    if (this.subscriptionForm.invalid) {
      Object.keys(this.subscriptionForm.controls).forEach((key) => {
        this.subscriptionForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isLoading.set(true);
    const formValue = this.subscriptionForm.value;

    // Get tenant ID (could be object from autocomplete or string)
    const tenantId = typeof formValue.tenantId === 'string' 
      ? formValue.tenantId 
      : formValue.tenantId?.id || formValue.tenantId;

    if (this.isEditMode && this.data.subscription) {
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

  onCancel(): void {
    this._dialogRef.close();
  }
}

