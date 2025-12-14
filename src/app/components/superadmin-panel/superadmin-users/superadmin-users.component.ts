import { Component, OnInit, OnDestroy, signal, inject, ViewChild } from '@angular/core';
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
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { Subject, takeUntil, Observable, debounceTime, switchMap } from 'rxjs';
import { UserRole } from '../../../models/types';
import { LoggerService } from '../../../services/logger.service';
import {
  SuperAdminService,
  UserData,
  TenantWithSubscription,
  TenantData,
} from '../../../services/superadmin.service';

@Component({
  selector: 'app-superadmin-users',
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
    MatAutocompleteModule,
    MatPaginatorModule,
  ],
  templateUrl: './superadmin-users.component.html',
  styleUrls: ['./superadmin-users.component.scss'],
})
export class SuperadminUsersComponent implements OnInit, OnDestroy {
  private _fb = inject(FormBuilder);
  private _superAdminService = inject(SuperAdminService);
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggerService);
  private _destroy$ = new Subject<void>();

  @ViewChild(MatPaginator) paginator!: MatPaginator;

  users = signal<UserData[]>([]);
  dataSource = new MatTableDataSource<UserData>([]);
  tenants = signal<TenantWithSubscription[]>([]);
  filteredTenants$!: Observable<any[]>;
  filteredTenantsFilter$!: Observable<any[]>;
  tenantControl = signal('');
  userForm: FormGroup;
  editingUser = signal<UserData | null>(null);
  userColumns = ['username', 'email', 'role', 'fullName', 'active', 'tenantName', 'actions'];
  isLoading = signal(false);
  error = signal<string | null>(null);

  // Server-side pagination
  currentPage = signal(1);
  pageSize = signal(25);
  totalUsers = signal(0);
  totalPages = signal(0);

  userRoles: UserRole[] = ['admin', 'waiter'];

  // Server-side search and filters
  searchTerm = signal('');
  selectedTenantFilter = signal<string>(''); // Tenant ID for filtering
  selectedRoleFilter = signal<string>(''); // Role for filtering

  constructor() {
    this.userForm = this._fb.group({
      tenantId: [null, Validators.required],
      username: ['', [Validators.required, Validators.minLength(3)]],
      email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['waiter', Validators.required],
      fullName: ['', Validators.required],
      active: [true],
    });

    // Setup tenant autocomplete
    this._setupTenantAutocomplete();

    // Watch for username changes to auto-generate email
    this.userForm
      .get('username')
      ?.valueChanges.pipe(debounceTime(300), takeUntil(this._destroy$))
      .subscribe(() => this._updateEmail());
  }

  ngOnInit(): void {
    this._loadUsers();
  }

  ngAfterViewInit(): void {
    // Listen to paginator events
    this.paginator.page.pipe(takeUntil(this._destroy$)).subscribe(() => {
      this.currentPage.set(this.paginator.pageIndex + 1);
      this.pageSize.set(this.paginator.pageSize);
      this._loadUsers();
    });
  }

  ngOnDestroy(): void {
    this._destroy$.next();
    this._destroy$.complete();
  }

  private _loadUsers(): void {
    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      search: this.searchTerm(),
      tenantId: this.selectedTenantFilter() || undefined,
      role: this.selectedRoleFilter() || undefined,
    };

    this._superAdminService
      .getUsersPaginated(params)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (response) => {
          this.users.set(response.users);
          this.dataSource.data = response.users;

          if (response.pagination) {
            this.totalUsers.set(response.pagination.total);
            this.totalPages.set(response.pagination.totalPages);

            // Update paginator without triggering event
            if (this.paginator) {
              this.paginator.length = response.pagination.total;
              this.paginator.pageIndex = response.pagination.page - 1;
            }
          }

          this.isLoading.set(false);
        },
        error: (error) => {
          this._logger.error('Failed to load users:', error);
          this.error.set('Failed to load users');
          this.isLoading.set(false);
          this._showError('Failed to load users');
        },
      });
  }

  private _setupTenantAutocomplete(): void {
    // Create separate FormControls for form and filter
    const formSearchControl = this._fb.control('');
    const filterSearchControl = this._fb.control('');

    // Setup autocomplete for user creation form
    this.filteredTenants$ = formSearchControl.valueChanges.pipe(
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

    // Setup autocomplete for filter
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

    // Store controls for template access
    (this.userForm as any).tenantSearchControl = formSearchControl;
    (this.userForm as any).tenantFilterControl = filterSearchControl;
  }

  getTenantSearchControl() {
    return (this.userForm as any).tenantSearchControl;
  }

  getTenantFilterControl() {
    return (this.userForm as any).tenantFilterControl;
  }

  displayTenantFn = (tenant: TenantData | null): string => {
    if (!tenant) return '';
    return `${tenant.name} (${tenant.subdomain})`;
  };

  onTenantSelected(event: any): void {
    const tenant = event.option.value;
    this.userForm.patchValue({
      tenantId: tenant ? tenant.id : null,
    });
    this._updateEmail();
  }

  getTenantDisplay(): string {
    const tenantId = this.userForm.get('tenantId')?.value;
    if (!tenantId) return 'No Tenant (Superadmin)';

    // Try to get from current form search value
    const searchControl = (this.userForm as any).tenantSearchControl;
    const currentValue = searchControl?.value;
    if (currentValue && typeof currentValue === 'object') {
      return `${currentValue.name} (${currentValue.subdomain})`;
    }

    return 'Tenant selected';
  }

  private _updateEmail(): void {
    const username = this.userForm.get('username')?.value;
    const searchControl = (this.userForm as any).tenantSearchControl;
    const tenantValue = searchControl?.value;

    if (username && tenantValue && typeof tenantValue === 'object') {
      const email = `${username}@${tenantValue.subdomain}.com`;
      this.userForm.get('email')?.setValue(email);
    } else if (username) {
      // If no tenant, use a default domain
      this.userForm.get('email')?.setValue(`${username}@system.com`);
    }
  }

  onSearchChange(search: string): void {
    this.searchTerm.set(search);
    this.currentPage.set(1); // Reset to first page
    this._debounceSearch();
  }

  private _debounceSearch = this._debounce(() => {
    this._loadUsers();
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
    this._loadUsers();
  }

  onRoleFilterChange(role: string): void {
    this.selectedRoleFilter.set(role);
    this.currentPage.set(1);
    this._loadUsers();
  }

  clearFilters(): void {
    this.searchTerm.set('');
    this.selectedTenantFilter.set('');
    this.selectedRoleFilter.set('');
    this.currentPage.set(1);
    this._loadUsers();
  }

  createUser(): void {
    if (this.userForm.invalid) {
      this._markFormGroupTouched(this.userForm);
      return;
    }

    this.isLoading.set(true);
    const userData = this.userForm.value;

    this._superAdminService
      .createUser(userData)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (_user) => {
          this.isLoading.set(false);
          this._showSuccess('User created successfully');
          this._resetForm();
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to create user:', error);
          this._showError('Failed to create user: ' + (error.error?.message || error.message));
        },
      });
  }

  editUser(user: UserData): void {
    this.editingUser.set(user);
    this.userForm.patchValue({
      tenantId: user.tenantId,
      username: user.username,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      active: user.active,
    });
    // Remove password requirement for editing
    this.userForm.get('password')?.clearValidators();
    this.userForm.get('password')?.updateValueAndValidity();
  }

  updateUser(): void {
    const editingUser = this.editingUser();
    if (this.userForm.invalid || !editingUser) {
      this._markFormGroupTouched(this.userForm);
      return;
    }

    this.isLoading.set(true);
    const updates = { ...this.userForm.value };
    // Remove password if empty (don't update password)
    if (!updates.password) {
      delete updates.password;
    }

    this._superAdminService
      .updateUser(editingUser.id, updates)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (_user) => {
          this.isLoading.set(false);
          this._showSuccess('User updated successfully');
          this.cancelEdit();
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to update user:', error);
          this._showError('Failed to update user: ' + (error.error?.message || error.message));
        },
      });
  }

  toggleUserStatus(user: UserData): void {
    this.isLoading.set(true);
    const newStatus = !user.active;

    this._superAdminService
      .updateUser(user.id, { active: newStatus })
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this._showSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully`);
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to toggle user status:', error);
          this._showError('Failed to update user status');
        },
      });
  }

  deleteUser(user: UserData): void {
    if (
      !confirm(
        `Are you sure you want to delete user "${user.fullName}"? This action cannot be undone.`,
      )
    ) {
      return;
    }

    this.isLoading.set(true);
    this._superAdminService
      .deleteUser(user.id)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this._showSuccess('User deleted successfully');
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to delete user:', error);
          this._showError('Failed to delete user: ' + (error.error?.message || error.message));
        },
      });
  }

  switchUserTenant(user: UserData, newTenantId: string): void {
    this.isLoading.set(true);

    this._superAdminService
      .updateUser(user.id, { tenantId: newTenantId })
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this._showSuccess('User tenant updated successfully');
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to update user tenant:', error);
          this._showError('Failed to update user tenant');
        },
      });
  }

  viewUserDetails(user: UserData): void {
    // TODO: Open detailed view modal
    const details = `
User Details:
-------------
ID: ${user.id}
Username: ${user.username}
Email: ${user.email}
Full Name: ${user.fullName}
Role: ${user.role}
Active: ${user.active ? 'Yes' : 'No'}
Tenant: ${user.tenantName || 'N/A'}
Created: ${this.formatDate(user.createdAt)}
Last Login: ${this.formatDate(user.lastLogin)}
    `.trim();

    alert(details);
  }

  resetUserPassword(user: UserData): void {
    if (!confirm(`Are you sure you want to reset password for "${user.fullName}"?`)) {
      return;
    }

    this.isLoading.set(true);
    this._superAdminService
      .resetUserPassword(user.id)
      .pipe(takeUntil(this._destroy$))
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this._showSuccess(`Password reset successfully for ${user.fullName}`);
          // In a real application, you might want to show the temp password in a dialog
          // For now, we'll just log it (in production, this should be emailed)
          console.log('Temporary password:', response.tempPassword);
          this._logger.info('Password reset for user:', user.username, 'Temp password generated');
        },
        error: (error) => {
          this.isLoading.set(false);
          this._logger.error('Failed to reset password:', error);
          this._showError('Failed to reset password: ' + (error.error?.message || error.message));
        },
      });
  }

  cancelEdit(): void {
    this.editingUser.set(null);
    this._resetForm();
    // Restore password requirement for creating
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();
  }

  private _resetForm(): void {
    this.userForm.reset({
      role: 'waiter',
      active: true,
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

  formatDate(date: Date | string | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleString();
  }

  getRoleBadgeClass(role: UserRole): string {
    const roleClasses: Record<UserRole, string> = {
      superadmin: 'role-superadmin',
      admin: 'role-admin',
      manager: 'role-manager',
      waiter: 'role-waiter',
      customer: 'role-customer',
    };
    return roleClasses[role] || 'role-default';
  }

  getStatusBadgeClass(active: boolean): string {
    return active ? 'status-active' : 'status-inactive';
  }
}
