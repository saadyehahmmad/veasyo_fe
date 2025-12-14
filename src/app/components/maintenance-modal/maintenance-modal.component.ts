import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HealthCheckService } from '../../services/health-check.service';

@Component({
  selector: 'app-maintenance-modal',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="maintenance-modal">
      <div class="modal-icon">
        <mat-icon>construction</mat-icon>
      </div>

      <h2>System Under Maintenance</h2>

      <p class="message">
        We're currently experiencing connectivity issues with our backend services. Please wait
        while we attempt to reconnect.
      </p>

      <div class="status">
        <mat-spinner diameter="40"></mat-spinner>
        <span>Checking connection...</span>
      </div>

      <div class="actions">
        <button mat-raised-button color="primary" (click)="retry()">
          <mat-icon>refresh</mat-icon>
          Retry Connection
        </button>
      </div>

      <p class="help-text">If this issue persists, please contact support or try again later.</p>
    </div>
  `,
  styles: [
    `
      .maintenance-modal {
        padding: 32px;
        text-align: center;
        max-width: 500px;
      }

      .modal-icon {
        margin-bottom: 24px;

        mat-icon {
          font-size: 80px;
          width: 80px;
          height: 80px;
          color: #f59e0b;
        }
      }

      h2 {
        margin: 0 0 16px;
        font-size: 24px;
        font-weight: 600;
        color: #111827;
      }

      .message {
        margin: 0 0 32px;
        color: #6b7280;
        font-size: 16px;
        line-height: 1.5;
      }

      .status {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 16px;
        margin-bottom: 32px;
        padding: 20px;
        background: #f9fafb;
        border-radius: 12px;

        span {
          color: #6b7280;
          font-size: 14px;
        }
      }

      .actions {
        margin-bottom: 24px;

        button {
          min-width: 200px;
        }
      }

      .help-text {
        margin: 0;
        font-size: 14px;
        color: #9ca3af;
      }
    `,
  ],
})
export class MaintenanceModalComponent {
  private _healthCheckService = inject(HealthCheckService);

  retry(): void {
    this._healthCheckService.manualCheck();
  }
}
