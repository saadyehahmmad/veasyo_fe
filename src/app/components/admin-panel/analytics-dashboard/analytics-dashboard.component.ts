import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AnalyticsSummary, ApiService } from '../../../services/api.service';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-analytics-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  templateUrl: './analytics-dashboard.component.html',
  styleUrls: ['./analytics-dashboard.component.scss'],
})
export class AnalyticsDashboardComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggerService);

  analytics = signal<AnalyticsSummary | null>(null);
  loading = signal(false);

  ngOnInit(): void {
    this._loadAnalytics();
  }

  private _loadAnalytics(): void {
    this.loading.set(true);
    this._apiService.getAnalyticsSummary().subscribe({
      next: (analytics) => {
        this.analytics.set(analytics);
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error loading analytics:', error);
        this._snackBar.open('Failed to load analytics', 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  getRequestTypeEntries(): [string, number][] {
    const analytics = this.analytics();
    return analytics ? Object.entries(analytics.requestsByType) : [];
  }

  getRequestTableEntries(): [string, number][] {
    const analytics = this.analytics();
    return analytics ? Object.entries(analytics.requestsByTable) : [];
  }
}
