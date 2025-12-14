import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { Observable, throwError, timer } from 'rxjs';
import { retryWhen, mergeMap, finalize } from 'rxjs/operators';
import { AuthService } from '../../services/auth.service';
import { LoggerService } from '../../services/logger.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule,
    MatSnackBarModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private _fb = inject(FormBuilder);
  private _authService = inject(AuthService);
  private _router = inject(Router);
  private _logger = inject(LoggerService);
  private _snackBar = inject(MatSnackBar);

  loginForm: FormGroup;
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);
  showTenantField = signal(false);
  
  // Retry configuration
  readonly MAX_RETRIES = 3; // Made public for template access
  private readonly INITIAL_RETRY_DELAY = 1000; // 1 second
  retryCount = signal(0);
  isRetrying = signal(false);

  constructor() {
    this.loginForm = this._fb.group({
      identifier: ['', [Validators.required]],
      password: ['', [Validators.required]],
      tenantId: [''],
    });
  }

  onSubmit(): void {
    if (this.loginForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set(null);
      this.retryCount.set(0);
      this.isRetrying.set(false);

      const { identifier, password, tenantId } = this.loginForm.value;

      // Create login observable with retry logic
      const loginObservable = this._authService.login({
        identifier: identifier.trim(),
        password,
        tenantId: tenantId?.trim() || undefined,
      });

      // Apply retry logic for network errors and server errors (5xx)
      this._loginWithRetry(loginObservable).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.isRetrying.set(false);
          this.retryCount.set(0);
          this._logger.info('Login successful:', response.user);

          // Redirect based on user role
          this._redirectBasedOnRole(response.user.role);
        },
        error: (error) => {
          this.isLoading.set(false);
          this.isRetrying.set(false);
          this._logger.error('Login failed after retries:', error);
          
          // Determine error message based on error type
          let errorMsg = 'Login failed. Please try again.';
          
          if (error.status === 0) {
            // Network error
            errorMsg = 'Network error. Please check your connection and try again.';
          } else if (error.status >= 500) {
            // Server error
            errorMsg = 'Server error. Please try again in a moment.';
          } else if (error.status === 401) {
            // Authentication error
            errorMsg = error.error?.message || 'Invalid credentials. Please check your email and password.';
          } else if (error.status === 429) {
            // Rate limit error
            errorMsg = 'Too many login attempts. Please wait a moment before trying again.';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          }
          
          this.errorMessage.set(errorMsg);
          
          // Show snackbar notification
          this._snackBar.open(errorMsg, 'Close', {
            duration: 5000,
            horizontalPosition: 'center',
            verticalPosition: 'top',
          });
        },
      });
    }
  }

  /**
   * Login with exponential backoff retry logic
   * Retries on network errors (status 0) and server errors (5xx)
   */
  private _loginWithRetry(loginObservable: Observable<any>): Observable<any> {
    return loginObservable.pipe(
      retryWhen((errors) =>
        errors.pipe(
          mergeMap((error, attempt) => {
            // Don't retry on client errors (4xx) except 429 (rate limit)
            if (error.status >= 400 && error.status < 500 && error.status !== 429) {
              return throwError(() => error);
            }

            // Don't retry if we've exceeded max retries
            if (attempt >= this.MAX_RETRIES) {
              return throwError(() => error);
            }

            // Calculate exponential backoff delay: 1s, 2s, 4s
            const delay = this.INITIAL_RETRY_DELAY * Math.pow(2, attempt);
            
            this.retryCount.set(attempt + 1);
            this.isRetrying.set(true);
            
            this._logger.info(`Login attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error);
            
            // Show retry notification
            this._snackBar.open(
              `Connection issue. Retrying... (${this.retryCount()}/${this.MAX_RETRIES})`,
              'Dismiss',
              {
                duration: delay,
                horizontalPosition: 'center',
                verticalPosition: 'top',
              }
            );

            // Return timer observable for exponential backoff
            return timer(delay);
          })
        )
      ),
      finalize(() => {
        // Reset retry state when observable completes or errors
        this.isRetrying.set(false);
      })
    );
  }

  private _redirectBasedOnRole(role: string): void {
    switch (role) {
      case 'admin':
        this._router.navigate(['/admin']);
        break;
      case 'waiter':
        this._router.navigate(['/waiter']);
        break;
      case 'superadmin':
        this._router.navigate(['/superadmin']); // Superadmin has separate route
        break;
      default:
        this._router.navigate(['/']);
    }
  }

  toggleTenantField(): void {
    this.showTenantField.set(!this.showTenantField());
  }
}
