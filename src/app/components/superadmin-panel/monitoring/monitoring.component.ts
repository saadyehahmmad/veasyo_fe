import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { LoggerService } from '../../../services/logger.service';

interface HealthStatus {
  status: string;
  timestamp?: string;
  environment?: string;
  requestId?: string;
}

interface DbPoolStatus {
  totalCount: number;
  idleCount: number;
  waitingCount: number;
  requestId?: string;
}

interface SocketStatus {
  connectedClients: number;
  totalRooms: number;
  totalSockets: number;
  rooms: string[];
  requestId?: string;
}

interface SystemStatus {
  uptime: {
    process: number;
    system: number;
  };
  memory: {
    process: {
      used: number;
      total: number;
      external: number;
      rss: number;
    };
    system: {
      total: number;
      free: number;
      used: number;
    };
  };
  cpu: {
    count: number;
    model: string;
  };
  platform: {
    type: string;
    platform: string;
    arch: string;
    release: string;
  };
  nodeVersion: string;
  requestId?: string;
}

interface ComprehensiveHealth {
  status: string;
  timestamp: string;
  environment: string;
  requestId?: string;
  services: {
    database: {
      status: string;
      pool?: {
        total: number;
        idle: number;
        waiting: number;
      };
      error?: string;
    };
    redis: {
      status: string;
      error?: string;
    };
    socketIO: {
      status: string;
      connectedClients: number;
    };
    license: {
      status: string;
      enabled: boolean;
    };
  };
}

@Component({
  selector: 'app-monitoring',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatChipsModule,
  ],
  templateUrl: './monitoring.component.html',
  styleUrls: ['./monitoring.component.scss'],
})
export class MonitoringComponent implements OnInit, OnDestroy {
  private _http = inject(HttpClient);
  private _logger = inject(LoggerService);
  private _apiUrl = environment.apiUrl || '';

  // Health check data
  basicHealth = signal<HealthStatus | null>(null);
  dbPoolHealth = signal<DbPoolStatus | null>(null);
  socketHealth = signal<SocketStatus | null>(null);
  systemHealth = signal<SystemStatus | null>(null);
  comprehensiveHealth = signal<ComprehensiveHealth | null>(null);

  // Loading states
  isLoadingBasic = signal(false);
  isLoadingDbPool = signal(false);
  isLoadingSockets = signal(false);
  isLoadingSystem = signal(false);
  isLoadingComprehensive = signal(false);

  // Error states
  errors = signal<Record<string, string>>({});

  // Auto-refresh interval (5 minutes)
  private _refreshInterval: any;
  private readonly REFRESH_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  ngOnInit(): void {
    this.loadAllHealthChecks();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Load all health check endpoints
   */
  loadAllHealthChecks(): void {
    this.loadBasicHealth();
    this.loadDbPoolHealth();
    this.loadSocketHealth();
    this.loadSystemHealth();
    this.loadComprehensiveHealth();
  }

  /**
   * Load basic health check
   */
  loadBasicHealth(): void {
    this.isLoadingBasic.set(true);
    this._http.get<HealthStatus>(`${this._apiUrl}/api/health`).subscribe({
      next: (data) => {
        this.basicHealth.set(data);
        this.isLoadingBasic.set(false);
        this.errors.set({ ...this.errors(), basic: '' });
      },
      error: (error) => {
        this._logger.error('Failed to load basic health', error);
        this.isLoadingBasic.set(false);
        this.errors.set({
          ...this.errors(),
          basic: error.message || 'Failed to load basic health',
        });
      },
    });
  }

  /**
   * Load database pool health
   */
  loadDbPoolHealth(): void {
    this.isLoadingDbPool.set(true);
    this._http.get<DbPoolStatus>(`${this._apiUrl}/api/health/db-pool`).subscribe({
      next: (data) => {
        this.dbPoolHealth.set(data);
        this.isLoadingDbPool.set(false);
        this.errors.set({ ...this.errors(), dbPool: '' });
      },
      error: (error) => {
        this._logger.error('Failed to load database pool health', error);
        this.isLoadingDbPool.set(false);
        this.errors.set({
          ...this.errors(),
          dbPool: error.message || 'Failed to load database pool health',
        });
      },
    });
  }

  /**
   * Load Socket.IO health
   */
  loadSocketHealth(): void {
    this.isLoadingSockets.set(true);
    this._http.get<SocketStatus>(`${this._apiUrl}/api/health/sockets`).subscribe({
      next: (data) => {
        this.socketHealth.set(data);
        this.isLoadingSockets.set(false);
        this.errors.set({ ...this.errors(), sockets: '' });
      },
      error: (error) => {
        this._logger.error('Failed to load Socket.IO health', error);
        this.isLoadingSockets.set(false);
        this.errors.set({
          ...this.errors(),
          sockets: error.message || 'Failed to load Socket.IO health',
        });
      },
    });
  }

  /**
   * Load system health
   */
  loadSystemHealth(): void {
    this.isLoadingSystem.set(true);
    this._http.get<SystemStatus>(`${this._apiUrl}/api/health/system`).subscribe({
      next: (data) => {
        this.systemHealth.set(data);
        this.isLoadingSystem.set(false);
        this.errors.set({ ...this.errors(), system: '' });
      },
      error: (error) => {
        this._logger.error('Failed to load system health', error);
        this.isLoadingSystem.set(false);
        this.errors.set({
          ...this.errors(),
          system: error.message || 'Failed to load system health',
        });
      },
    });
  }

  /**
   * Load comprehensive health
   */
  loadComprehensiveHealth(): void {
    this.isLoadingComprehensive.set(true);
    this._http.get<ComprehensiveHealth>(`${this._apiUrl}/api/health/comprehensive`).subscribe({
      next: (data) => {
        this.comprehensiveHealth.set(data);
        this.isLoadingComprehensive.set(false);
        this.errors.set({ ...this.errors(), comprehensive: '' });
      },
      error: (error) => {
        this._logger.error('Failed to load comprehensive health', error);
        this.isLoadingComprehensive.set(false);
        this.errors.set({
          ...this.errors(),
          comprehensive: error.message || 'Failed to load comprehensive health',
        });
      },
    });
  }

  /**
   * Refresh all health checks
   */
  refreshAll(): void {
    this.loadAllHealthChecks();
  }

  /**
   * Start auto-refresh
   */
  private startAutoRefresh(): void {
    this._refreshInterval = setInterval(() => {
      this.loadAllHealthChecks();
    }, this.REFRESH_INTERVAL_MS);
  }

  /**
   * Stop auto-refresh
   */
  private stopAutoRefresh(): void {
    if (this._refreshInterval) {
      clearInterval(this._refreshInterval);
    }
  }

  /**
   * Format bytes to human-readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Format seconds to human-readable format
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  }

  /**
   * Get status color
   */
  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'ok':
        return 'primary';
      case 'error':
        return 'warn';
      case 'degraded':
        return 'accent';
      default:
        return '';
    }
  }

  /**
   * Check if service is healthy
   */
  isServiceHealthy(status: string): boolean {
    return status.toLowerCase() === 'ok';
  }
}

