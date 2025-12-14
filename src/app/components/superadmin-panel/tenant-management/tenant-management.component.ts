import { Component, OnInit, OnDestroy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Subject, takeUntil } from 'rxjs';
import { LoggerService } from '../../../services/logger.service';
import {
  SuperAdminService,
  TenantWithSubscription,
  TenantData,
} from '../../../services/superadmin.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-tenant-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatChipsModule,
    MatSnackBarModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './tenant-management.component.html',
  styleUrls: ['./tenant-management.component.scss'],
})
export class TenantManagementComponent implements OnInit, OnDestroy {
  private _fb = inject(FormBuilder);
  private _superAdminService = inject(SuperAdminService);
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggerService);
  private _destroy$ = new Subject<void>();

  tenants = signal<TenantWithSubscription[]>([]);
  tenantForm: FormGroup;
  editingTenant = signal<TenantData | null>(null);
  tenantColumns = ['name', 'subdomain', 'plan', 'maxTables', 'status', 'subscription', 'actions'];
  isLoading = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.tenantForm = this._fb.group({
      name: ['', Validators.required],
      slug: ['', [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)]],
      subdomain: [
        { value: '', disabled: true },
        [Validators.required, Validators.pattern(/^[a-z0-9-]+$/)],
      ],
      plan: ['free', Validators.required],
      maxTables: [10, [Validators.required, Validators.min(1)]],
      maxUsers: [5, [Validators.required, Validators.min(1)]],
      active: [true],
      settings: [{}],
    });

    // Auto-generate slug and subdomain from name
    this.tenantForm
      .get('name')
      ?.valueChanges.pipe(takeUntil(this._destroy$))
      .subscribe((name) => {
        if (name && !this.editingTenant()) {
          const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-');
          this.tenantForm.patchValue({ slug }, { emitEvent: false });
          this.tenantForm.get('subdomain')?.setValue(slug);
        }
      });

    // Update subdomain when slug changes
    this.tenantForm
      .get('slug')
      ?.valueChanges.pipe(takeUntil(this._destroy$))
      .subscribe((slug) => {
        if (slug) {
          this.tenantForm.get('subdomain')?.setValue(slug);
        }
      });
  }

  getFullSubdomainURL(): string {
    const subdomain = this.tenantForm.get('subdomain')?.value;
    if (!subdomain) return 'https://[subdomain].' + environment.domainURL + '.com';
    return `https://${subdomain}.${environment.domainURL}.com`;
  }

  ngOnInit(): void {
    this._loadTenants();

    // Subscribe to real-time updates
    this._superAdminService.tenants$.pipe(takeUntil(this._destroy$)).subscribe((tenants) => {
      this.tenants.set(tenants);
      this.error.set(null);
    });

    this.isLoading.set(this._superAdminService.isLoading());
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _loadTenants(): void {
    this._superAdminService
      .getAllTenants()
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (tenants) => {
          this.tenants.set(tenants);
          this.isLoading.set(false);
        },
        error: (error) => {
          this._logger.error('Failed to load tenants:', error);
          this.error.set('Failed to load tenants');
          this.isLoading.set(false);
          this._showError('Failed to load tenants');
        },  
      });
  }

  // Public method for retry functionality
  loadTenants(): void {
    this.isLoading.set(true);
    this.error.set(null);
    this._loadTenants();
  }

  createTenant(): void {
    if (this.tenantForm.invalid) {
      this._markFormGroupTouched(this.tenantForm);
      return;
    }

    this.isLoading.set(true);
    const tenantData = this.tenantForm.value;

    this._superAdminService
      .createTenant(tenantData)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (_tenant) => {
          this.isLoading.set(false);
          this._showSuccess('Tenant created successfully');
          this._resetForm();
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to create tenant:', error);
          this._showError('Failed to create tenant: ' + (error.error?.message || error.message));
        },
      });
  }

  editTenant(item: TenantWithSubscription): void {
    this.editingTenant.set(item.tenant);
    this.tenantForm.patchValue({
      name: item.tenant.name,
      slug: item.tenant.slug,
      subdomain: item.tenant.subdomain,
      plan: item.tenant.plan,
      maxTables: item.tenant.maxTables,
      maxUsers: item.tenant.maxUsers,
      active: item.tenant.active,
    });
  }

  updateTenant(): void {
    const editingTenant = this.editingTenant();
    if (this.tenantForm.invalid || !editingTenant) {
      this._markFormGroupTouched(this.tenantForm);
      return;
    }

    this.isLoading.set(true);
    const updates = this.tenantForm.value;

    this._superAdminService
      .updateTenant(editingTenant.id, updates)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (_tenant) => {
          this.isLoading.set(false);
          this._showSuccess('Tenant updated successfully');
          this.cancelEdit();
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to update tenant:', error);
          this._showError('Failed to update tenant: ' + (error.error?.message || error.message));
        },
      });
  }

  deleteTenant(item: TenantWithSubscription): void {
    if (
      !confirm(
        `Are you sure you want to delete tenant "${item.tenant.name}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.isLoading.set(true);
    this._superAdminService
      .deleteTenant(item.tenant.id)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this._showSuccess('Tenant deleted successfully');
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to delete tenant:', error);
          this._showError('Failed to delete tenant: ' + (error.error?.message || error.message));
        },
      });
  }
  cancelEdit(): void {
    this.editingTenant.set(null);
    this._resetForm();
  }

  private _resetForm(): void {
    this.tenantForm.reset({
      plan: 'free',
      maxTables: 10,
      maxUsers: 5,
      active: true,
      settings: {},
    });
  }

  private _markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
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

  formatDate(date: Date | string): string {
    if (!date) return '';
    return new Date(date).toLocaleString();
  }

  getStatusBadgeClass(active: boolean): string {
    return active ? 'status-active' : 'status-inactive';
  }

  getSubscriptionStatusBadgeClass(status?: string): string {
    switch (status) {
      case 'active':
        return 'subscription-active';
      case 'expired':
        return 'subscription-expired';
      case 'cancelled':
        return 'subscription-cancelled';
      default:
        return 'subscription-none';
    }
  }
}
