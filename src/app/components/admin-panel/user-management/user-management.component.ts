import { Component, OnInit, signal, inject } from '@angular/core';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { User } from '../../../models/types';
import { ApiService } from '../../../services/api.service';
import { LoggerService } from '../../../services/logger.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss'],
})
export class UserManagementComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggerService);
  private _translate = inject(TranslateService);

  users = signal<User[]>([]);
  loading = signal(false);
  editingUser = signal<User | null>(null);
  changingPasswordUser = signal<User | null>(null);
  userForm: FormGroup;
  passwordForm: FormGroup;
  userColumns = ['username', 'email', 'fullName', 'active', 'tenantSubdomain', 'actions'];

  constructor(private _fb: FormBuilder) {
    this.userForm = this._fb.group({
      username: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      fullName: ['', Validators.required],
    });

    this.passwordForm = this._fb.group(
      {
        newPassword: ['', [Validators.required, Validators.minLength(8)]],
        confirmPassword: ['', Validators.required],
      },
      { validators: this._passwordMatchValidator },
    );
  }

  private _passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return password === confirm ? null : { passwordMismatch: true };
  }

  ngOnInit(): void {
    this._loadUsers();
  }

  private _loadUsers(): void {
    this.loading.set(true);
    this._apiService.getUsers().subscribe({
      next: (users) => {
        this.users.set(users);
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error loading users:', error);
        this._snackBar.open(this._translate.instant('admin.userManagement.failedToLoadUsers'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  createUser(): void {
    if (this.userForm.invalid) {
      this._snackBar.open(this._translate.instant('admin.userManagement.fillRequiredFields'), 'Close', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    // Always create as waiter role with active status
    const userData = {
      ...this.userForm.value,
      role: 'waiter',
      active: true,
    };

    this._apiService.createUser(userData).subscribe({
      next: (user) => {
        this.users.update((users) => [...users, user]);
        this.userForm.reset();
        this._snackBar.open(this._translate.instant('admin.userManagement.waiterCreated'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error creating user:', error);
        const errorMsg = error.error?.message || this._translate.instant('admin.userManagement.failedToCreateWaiter');
        this._snackBar.open(`❌ ${errorMsg}`, 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  toggleUserStatus(user: User): void {
    const newStatus = !user.active;
    const action = newStatus ? this._translate.instant('admin.userManagement.activate') : this._translate.instant('admin.userManagement.deactivate');

    if (!confirm(`${this._translate.instant('admin.userManagement.confirmAction')} ${action} ${user.fullName}?`)) {
      return;
    }

    this.loading.set(true);
    this._apiService.updateUser(user.id, { active: newStatus }).subscribe({
      next: (updatedUser) => {
        this.users.update((users) => users.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
        const statusText = newStatus ? this._translate.instant('admin.userManagement.activated') : this._translate.instant('admin.userManagement.deactivated');
        this._snackBar.open(`${user.fullName} ${statusText}`, 'Close', { duration: 3000 });
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error updating user status:', error);
        this._snackBar.open(this._translate.instant('admin.userManagement.failedToAction', { action }), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  openChangePassword(user: User): void {
    this.changingPasswordUser.set(user);
    this.passwordForm.reset();
  }

  changePassword(): void {
    if (this.passwordForm.invalid) {
      if (this.passwordForm.hasError('passwordMismatch')) {
        this._snackBar.open(this._translate.instant('admin.userManagement.passwordsDoNotMatch'), 'Close', { duration: 3000 });
      } else {
        this._snackBar.open(this._translate.instant('admin.userManagement.fillRequiredFields'), 'Close', { duration: 3000 });
      }
      return;
    }

    const user = this.changingPasswordUser();
    if (!user) return;

    this.loading.set(true);
    const newPassword = this.passwordForm.get('newPassword')?.value;

    this._apiService.updateUser(user.id, { password: newPassword }).subscribe({
      next: () => {
        this.changingPasswordUser.set(null);
        this.passwordForm.reset();
        this._snackBar.open(this._translate.instant('admin.userManagement.passwordUpdated', { name: user.fullName }), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error changing password:', error);
        this._snackBar.open(this._translate.instant('admin.userManagement.failedToChangePassword'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  cancelPasswordChange(): void {
    this.changingPasswordUser.set(null);
    this.passwordForm.reset();
  }

  deleteUser(user: User): void {
    if (
      !confirm(
        this._translate.instant('admin.userManagement.confirmDelete', { name: user.fullName })
      )
    ) {
      return;
    }

    this.loading.set(true);
    this._apiService.deleteUser(user.id).subscribe({
      next: () => {
        this.users.update((users) => users.filter((u) => u.id !== user.id));
        this._snackBar.open(this._translate.instant('admin.userManagement.userRemoved', { name: user.fullName }), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error deleting user:', error);
        this._snackBar.open(this._translate.instant('admin.userManagement.failedToDeleteWaiter'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }
}
