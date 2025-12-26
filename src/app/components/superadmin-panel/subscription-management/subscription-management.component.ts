import { Component, OnInit, OnDestroy, inject, signal, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule } from '@ngx-translate/core';
import { Subject, takeUntil, Observable, debounceTime, switchMap, map } from 'rxjs';
import { SuperAdminService, TenantData } from '../../../services/superadmin.service';
import { LoggerService } from '../../../services/logger.service';
import { Subscription, CreateSubscriptionRequest, UpdateSubscriptionRequest } from '../../../models/subscription.model';
import { InvoiceVerificationComponent } from './invoice-verification/invoice-verification.component';

interface TenantOption {
  id: string;
  name: string;
  subdomain: string | null;
}

@Component({
  selector: 'app-superadmin-subscription-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatAutocompleteModule,
    MatPaginatorModule,
    MatSnackBarModule,
    TranslateModule,
    InvoiceVerificationComponent,
  ],
  templateUrl: './subscription-management.component.html',
  styleUrls: ['./subscription-management.component.scss'],
})
export class SuperadminSubscriptionManagementComponent implements OnInit, OnDestroy, AfterViewInit {
  private _fb = inject(FormBuilder);
  private _superAdminService = inject(SuperAdminService);
  private _logger = inject(LoggerService);
  private _snackBar = inject(MatSnackBar);
  private _destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  subscriptions = signal<Subscription[]>([]);
  dataSource = new MatTableDataSource<Subscription>([]);
  tenants = signal<TenantOption[]>([]);
  filteredTenants$!: Observable<TenantOption[]>;
  filteredTenantsFilter$!: Observable<any[]>;
  subscriptionForm: FormGroup;
  editingSubscription = signal<Subscription | null>(null);
  isLoading = signal(false);
  error = signal<string | null>(null);
  selectedTabIndex = signal(0);

  displayedColumns = [
    'invoiceNumber',
    'tenant',
    'plan',
    'startDate',
    'endDate',
    'maxTables',
    'maxUsers',
    'amount',
    'tax',
    'status',
    'actions',
  ];

  plans: ('free' | 'basic' | 'standard' | 'premium' | 'custom')[] = ['free', 'basic', 'standard', 'premium', 'custom'];

  // Server-side pagination
  currentPage = signal(1);
  pageSize = signal(25);
  totalSubscriptions = signal(0);

  // Search and filters
  searchTerm = signal('');
  selectedTenantFilter = signal<string>('');

  constructor() {
    this.subscriptionForm = this._fb.group({
      tenantId: [null, Validators.required],
      plan: ['basic', Validators.required],
      startDate: [new Date(), Validators.required],
      endDate: [null, Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      tax: [0, [Validators.min(0)]],
      maxTables: [10, [Validators.required, Validators.min(1)]],
      maxUsers: [5, [Validators.required, Validators.min(1)]],
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

    this._setupTenantAutocomplete();
  }

  ngOnInit(): void {
    this.loadTenants();
    this.loadSubscriptions();
  }

  ngAfterViewInit(): void {
    if (this.paginator) {
      this.paginator.page.pipe(takeUntil(this._destroy$)).subscribe(() => {
        this.currentPage.set(this.paginator.pageIndex + 1);
        this.pageSize.set(this.paginator.pageSize);
        this.loadSubscriptions();
      });
    }
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _setupTenantAutocomplete(): void {
    const formSearchControl = this._fb.control('');
    const filterSearchControl = this._fb.control('');

    this.filteredTenants$ = formSearchControl.valueChanges.pipe(
      debounceTime(300),
      switchMap((value) => {
        const searchTerm = typeof value === 'string' ? value : '';
        if (searchTerm.length >= 2) {
          return this._superAdminService.searchTenants(searchTerm, 20);
        }
        return [];
      }),
      map((tenants) =>
        tenants.map((t) => ({
          id: t.id,
          name: t.name,
          subdomain: t.subdomain,
        }))
      ),
      takeUntil(this._destroy$),
    );

    this.filteredTenantsFilter$ = filterSearchControl.valueChanges.pipe(
      debounceTime(300),
      switchMap((value) => {
        const searchTerm = typeof value === 'string' ? value : '';
        if (searchTerm.length >= 2) {
          return this._superAdminService.searchTenants(searchTerm, 20);
        }
        return [];
      }),
      takeUntil(this._destroy$),
    );

    (this.subscriptionForm as any).tenantSearchControl = formSearchControl;
    (this.subscriptionForm as any).tenantFilterControl = filterSearchControl;
  }

  getTenantSearchControl() {
    return (this.subscriptionForm as any).tenantSearchControl;
  }

  getTenantFilterControl() {
    return (this.subscriptionForm as any).tenantFilterControl;
  }

  displayTenantFn = (tenant: TenantData | null): string => {
    if (!tenant) return '';
    return `${tenant.name} (${tenant.subdomain})`;
  };

  onTenantSelected(event: any): void {
    const tenant = event.option.value;
    this.subscriptionForm.patchValue({
      tenantId: tenant ? tenant.id : null,
    });
  }

  getTenantDisplay(): string {
    const tenantId = this.subscriptionForm.get('tenantId')?.value;
    if (!tenantId) return 'No Tenant Selected';

    const searchControl = (this.subscriptionForm as any).tenantSearchControl;
    const currentValue = searchControl?.value;
    if (currentValue && typeof currentValue === 'object') {
      return `${currentValue.name} (${currentValue.subdomain})`;
    }

    return 'Tenant selected';
  }

  loadTenants(): void {
    this._superAdminService.getAllTenants().subscribe({
      next: (tenants) => {
        const tenantOptions: TenantOption[] = tenants.map((t) => {
          const tenant = (t as any).tenant || t;
          return {
            id: tenant?.id || '',
            name: tenant?.name || '',
            subdomain: tenant?.subdomain || null,
          };
        }).filter((t) => t.id);
        this.tenants.set(tenantOptions);
      },
      error: (error) => {
        this._logger.error('Failed to load tenants:', error);
      },
    });
  }

  loadSubscriptions(): void {
    this.isLoading.set(true);
    this.error.set(null);

    this._superAdminService.getAllSubscriptions().subscribe({
      next: (response) => {
        let subscriptions = response.subscriptions || [];
        
        // Apply filters
        if (this.searchTerm()) {
          const search = this.searchTerm().toLowerCase();
          subscriptions = subscriptions.filter(
            (sub) =>
              sub.tenant?.name?.toLowerCase().includes(search) ||
              sub.tenant?.subdomain?.toLowerCase().includes(search) ||
              sub.plan?.toLowerCase().includes(search)
          );
        }

        if (this.selectedTenantFilter()) {
          subscriptions = subscriptions.filter(
            (sub) => sub.tenantId === this.selectedTenantFilter()
          );
        }

        this.subscriptions.set(subscriptions);
        this.dataSource.data = subscriptions;
        this.totalSubscriptions.set(subscriptions.length);
        
        if (this.paginator) {
          this.paginator.length = subscriptions.length;
        }
        
        this.isLoading.set(false);
      },
      error: (error) => {
        this._logger.error('Failed to load subscriptions:', error);
        this.error.set('Failed to load subscriptions');
        this.isLoading.set(false);
        this._snackBar.open('Failed to load subscriptions', 'Close', { duration: 3000 });
      },
    });
  }

  onSearchChange(search: string): void {
    this.searchTerm.set(search);
    this.currentPage.set(1);
    this._debounceSearch();
  }

  private _debounceSearch = this._debounce(() => {
    this.loadSubscriptions();
  }, 500);

  private _debounce(func: () => void, wait: number): () => void {
    let timeout: any;
    return () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(), wait);
    };
  }

  onTenantFilterChange(tenantId: string): void {
    this.selectedTenantFilter.set(tenantId);
    this.currentPage.set(1);
    this.loadSubscriptions();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedTenantFilter.set('');
    this.currentPage.set(1);
    this.loadSubscriptions();
  }

  createSubscription(): void {
    if (this.subscriptionForm.invalid) {
      this._markFormGroupTouched(this.subscriptionForm);
      return;
    }

    this.isLoading.set(true);
    const formValue = this.subscriptionForm.value;
    const tenantId = formValue.tenantId;

    const createRequest: CreateSubscriptionRequest = {
      tenantId,
      plan: formValue.plan,
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString(),
      amount: formValue.amount,
      tax: formValue.tax || 0,
      maxTables: formValue.maxTables,
      maxUsers: formValue.maxUsers,
    };

    this._superAdminService.createTenantSubscription(createRequest).subscribe({
      next: () => {
        this.isLoading.set(false);
        this._snackBar.open('Subscription created successfully', 'Close', { duration: 3000 });
        this.resetForm();
        this.loadSubscriptions();
      },
      error: (error) => {
        this._logger.error('Failed to create subscription:', error);
        this.isLoading.set(false);
        this._snackBar.open(
          `Failed to create subscription: ${error.error?.message || error.message}`,
          'Close',
          { duration: 5000 }
        );
      },
    });
  }

  updateSubscription(): void {
    if (this.subscriptionForm.invalid) {
      this._markFormGroupTouched(this.subscriptionForm);
      return;
    }

    const subscription = this.editingSubscription();
    if (!subscription) return;

    this.isLoading.set(true);
    const formValue = this.subscriptionForm.value;

    const updateRequest: UpdateSubscriptionRequest = {
      plan: formValue.plan,
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString(),
      amount: formValue.amount,
      tax: formValue.tax || 0,
      maxTables: formValue.maxTables,
      maxUsers: formValue.maxUsers,
    };

    this._superAdminService.updateTenantSubscription(subscription.tenantId, updateRequest).subscribe({
      next: () => {
        this.isLoading.set(false);
        this._snackBar.open('Subscription updated successfully', 'Close', { duration: 3000 });
        this.cancelEdit();
        this.loadSubscriptions();
      },
      error: (error) => {
        this._logger.error('Failed to update subscription:', error);
        this.isLoading.set(false);
        this._snackBar.open(
          `Failed to update subscription: ${error.error?.message || error.message}`,
          'Close',
          { duration: 5000 }
        );
      },
    });
  }

  editSubscription(subscription: Subscription): void {
    this.editingSubscription.set(subscription);
    
    // Find tenant in our list
    const tenant = this.tenants().find((t) => t.id === subscription.tenantId);
    const searchControl = (this.subscriptionForm as any).tenantSearchControl;
    if (tenant && searchControl) {
      searchControl.setValue(tenant);
    }

    this.subscriptionForm.patchValue({
      tenantId: subscription.tenantId,
      plan: subscription.plan,
      startDate: subscription.startDate ? new Date(subscription.startDate) : new Date(),
      endDate: subscription.endDate ? new Date(subscription.endDate) : null,
      amount: subscription.amount ? subscription.amount / 100 : 0,
      tax: subscription.tax ? subscription.tax / 100 : 0,
      maxTables: subscription.maxTables || 10,
      maxUsers: subscription.maxUsers || 5,
    });
  }

  cancelEdit(): void {
    this.editingSubscription.set(null);
    this.resetForm();
  }

  resetForm(): void {
    this.subscriptionForm.reset({
      tenantId: null,
      plan: 'basic',
      startDate: new Date(),
      endDate: null,
      amount: 0,
      tax: 0,
      maxTables: 10,
      maxUsers: 5,
    });
    const searchControl = (this.subscriptionForm as any).tenantSearchControl;
    if (searchControl) {
      searchControl.setValue('');
    }
  }

  deleteSubscription(subscription: Subscription): void {
    if (!confirm(`Are you sure you want to delete the subscription for ${subscription.tenant?.name || 'this tenant'}? This will deactivate the tenant.`)) {
      return;
    }

    this.isLoading.set(true);
    this._superAdminService.deleteSubscription(subscription.id).subscribe({
      next: () => {
        this.isLoading.set(false);
        this._snackBar.open('Subscription deleted successfully', 'Close', { duration: 3000 });
        this.loadSubscriptions();
      },
      error: (error) => {
        this._logger.error('Failed to delete subscription:', error);
        this.isLoading.set(false);
        this._snackBar.open('Failed to delete subscription', 'Close', { duration: 3000 });
      },
    });
  }

  formatPrice(cents: number | null): string {
    if (!cents) return '$0.00';
    const usd = cents / 100;
    return `$${usd.toFixed(2)}`;
  }

  formatDate(dateString: string | null | undefined): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  }

  isExpired(endDate: string | null | undefined): boolean {
    if (!endDate) return false;
    return new Date(endDate) < new Date();
  }

  isExpiringSoon(endDate: string | null | undefined): boolean {
    if (!endDate) return false;
    const end = new Date(endDate).getTime();
    const now = new Date().getTime();
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return end - now < sevenDays && end > now;
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      active: 'primary',
      expired: 'warn',
      cancelled: 'accent',
      suspended: 'warn',
    };
    return colorMap[status] || 'primary';
  }

  generateInvoiceNumber(subscriptionId: string): string {
    // Format: INV-{first 8 chars of subscription ID}-0001
    const shortId = subscriptionId.substring(0, 8);
    return `INV-${shortId}-0001`;
  }

  selectTab(index: number | { index: number }): void {
    const tabIndex = typeof index === 'number' ? index : index.index;
    this.selectedTabIndex.set(tabIndex);
  }

  retry(): void {
    this.loadSubscriptions();
  }

  private _markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach((key) => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this._markFormGroupTouched(control);
      }
    });
  }
}
