import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { RequestType } from '../models/types';
import { AuthService } from './auth.service';
import { UrlUtilsService } from './url-utils.service';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root',
})
export class SocketService {
  // _socket is initialized in constructor via initializeSocket()
  // use definite assignment assertion so strictPropertyInitialization is satisfied
  private _socket!: Socket;
  private _authService = inject(AuthService);
  private _urlUtils = inject(UrlUtilsService);
  private _logger = inject(LoggerService);

  // Constants for log messages
  private readonly _TOKEN_REFRESHED_MESSAGE = 'Token refreshed, reconnecting _socket...';

  constructor() {
    this._initializeSocket();

    // Listen for token refresh events to reconnect _socket
    this._authService.tokenRefreshed$.subscribe((refreshed) => {
      if (refreshed && this._socket && !this._socket.connected) {
        this._logger.debug(this._TOKEN_REFRESHED_MESSAGE);
        this.reconnect();
      }
    });
  }

  private _initializeSocket(): void {
    const token = this._authService.getAccessToken();

    // Check token validity before connecting
    if (token && this._isTokenExpired(token)) {
      this._logger.debug('Token expired, refreshing before _socket connection...');
      this._authService.refreshToken().subscribe({
        next: () => {
          // Retry _socket initialization with fresh token
          this._initializeSocket();
        },
        error: (error) => {
          this._logger.error('Failed to refresh token for _socket connection:', error);
          this._authService.logout();
        },
      });
      return;
    }

    // Extract tenant subdomain from URL to pass to server - STRICT: no fallbacks
    let tenantSubdomain: string;
    try {
      tenantSubdomain = this._extractTenantFromUrl();
    } catch (error) {
      this._logger.error('Failed to initialize _socket: Tenant subdomain is required', error);
      // Create _socket but it will be rejected by server
      this._socket = io(environment.socketUrl, {
        autoConnect: false, // Don't auto-connect if no tenant
        reconnection: false,
      });
      this._setupEventListeners();
      return;
    }

    this._socket = io(environment.socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      auth: {
        token: token,
        tenantSubdomain: tenantSubdomain, // Pass tenant subdomain explicitly
      },
      query: {
        tenant: tenantSubdomain, // Also pass as query parameter for redundancy
      },
      extraHeaders: token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {},
    });

    this._setupEventListeners();
  }

  private _setupEventListeners(): void {
    this._socket.on('connect', () => {
      this._logger.debug('Socket connected:', this._socket.id);
    });

    this._socket.on('disconnect', () => {
      this._logger.debug('Socket disconnected');
    });

    this._socket.on('connect_error', (error) => {
      this._logger.error('Socket connection error:', error);

      // If error is related to authentication, try refreshing token
      if (error.message?.includes('Invalid or expired token')) {
        this._logger.debug('Token expired, attempting refresh...');
        this._authService.refreshToken().subscribe({
          next: () => {
            this._logger.debug(this._TOKEN_REFRESHED_MESSAGE);
            this.reconnect();
          },
          error: (refreshError) => {
            this._logger.error('Failed to refresh token:', refreshError);
            this._authService.logout();
          },
        });
      }
    });

    this._socket.on('error', (error) => {
      this._logger.error('Socket error:', error);

      // Handle authentication errors
      if (error && typeof error === 'string' && error.includes('Authentication required')) {
        this._logger.debug('Authentication error, refreshing token...');
        this._authService.refreshToken().subscribe({
          next: () => {
            this.reconnect();
          },
          error: (refreshError) => {
            this._logger.error('Failed to refresh token after auth error:', refreshError);
            this._authService.logout();
          },
        });
      }
    });

    this._socket.on('auth_error', (error) => {
      this._logger.error('Socket authentication error:', error);

      if (
        error.code === 'TOKEN_INVALID' ||
        error.code === 'TOKEN_EXPIRED' ||
        error.code === 'TOKEN_MALFORMED'
      ) {
        this._logger.debug('Token issue detected, attempting refresh...');
        this._authService.refreshToken().subscribe({
          next: () => {
            this._logger.debug(this._TOKEN_REFRESHED_MESSAGE);
            this.reconnect();
          },
          error: (refreshError) => {
            this._logger.error('Failed to refresh token:', refreshError);
            this._authService.logout();
          },
        });
      } else {
        this._logger.error('Authentication error that cannot be resolved:', error);
        this._authService.logout();
      }
    });

    // Listen for all events for debugging
    this._socket.onAny((event, ...args) => {
      this._logger.debug('Socket event received:', event, args);
    });
  }

  joinTable(tableId: string, tenantId?: string): void {
    // Allow unauthenticated users (customers) to join table rooms
    // This is needed so customers can receive request confirmations

    // Get tenant ID from parameter, user, or extract from URL
    let userTenantId = tenantId;

    if (!userTenantId) {
      // Always extract from subdomain - STRICT: no fallbacks
      try {
        userTenantId = this._extractTenantFromUrl();
      } catch (error) {
        this._logger.error('Cannot join table room:', error);
        return;
      }
    }

    if (!userTenantId) {
      this._logger.error('Cannot join table room: No tenant ID available');
      return;
    }

    this._logger.debug(`Joining table room: tenant-${userTenantId}-table-${tableId}`);
    this._socket.emit('join', `tenant-${userTenantId}-table-${tableId}`);
  }

  joinWaiterRoom(_tenantId?: string): void {
    if (!this._authService.isAuthenticated()) {
      this._logger.warn('Cannot join waiter room: User not authenticated');
      return;
    }

    // Always extract tenant from URL subdomain - STRICT: no fallbacks
    // The server broadcasts to tenant-{subdomain}-waiter, so we must use subdomain
    let userTenantId: string;

    try {
      userTenantId = this._extractTenantFromUrl();
      this._logger.debug(`Using tenant subdomain from URL: ${userTenantId}`);
    } catch (error) {
      this._logger.error('Cannot join waiter room:', error);
      return;
    }

    if (!userTenantId) {
      this._logger.warn('Cannot join waiter room: No tenant ID available');
      return;
    }

    const roomName = `tenant-${userTenantId}-waiter`;
    this._logger.debug(`Joining waiter room: ${roomName}`);
    this._socket.emit('join', roomName);
  }

  joinAdminRoom(_tenantId?: string): void {
    if (!this._authService.isAuthenticated()) {
      this._logger.warn('Cannot join admin room: User not authenticated');
      return;
    }

    // Always extract tenant from URL subdomain - STRICT: no fallbacks
    let userTenantId: string;

    try {
      userTenantId = this._extractTenantFromUrl();
    } catch (error) {
      this._logger.error('Cannot join admin room:', error);
      return;
    }

    if (!userTenantId) {
      this._logger.warn('Cannot join admin room: No tenant ID available');
      return;
    }

    this._logger.debug(`Joining admin room: tenant-${userTenantId}-admin`);
    this._socket.emit('join', `tenant-${userTenantId}-admin`);
  }

  callWaiter(tableId: string, type: RequestType = 'call_waiter', customNote?: string): void {
    // Allow unauthenticated users to call waiter (customers)
    this._socket.emit('call_waiter', { tableId, type, customNote });
  }

  acknowledgeRequest(requestId: string): void {
    if (!this._authService.isAuthenticated()) {
      this._logger.warn('Cannot acknowledge request: User not authenticated');
      return;
    }
    this._socket.emit('acknowledge_request', requestId);
  }

  completeRequest(requestId: string): void {
    // Allow both authenticated users (waiters) and unauthenticated users (customers) to complete requests
    this._socket.emit('complete_request', requestId);
  }

  cancelRequest(requestId: string): void {
    // Allow both authenticated users (waiters) and unauthenticated users (customers) to cancel requests
    this._socket.emit('cancel_request', requestId);
  }

  on<T = any>(eventName: string): Observable<T> {
    return new Observable((subscriber) => {
      this._socket.on(eventName, (data: T) => {
        subscriber.next(data);
      });

      return () => {
        this._socket.off(eventName);
      };
    });
  }

  disconnect(): void {
    if (this._socket) {
      this._socket.disconnect();
    }
  }

  get isConnected(): boolean {
    return this._socket?.connected ?? false;
  }

  // Reconnect with new auth token (useful after login/logout)
  reconnect(): void {
    this.disconnect();
    this._initializeSocket();
  }

  /**
   * Extract tenant subdomain from current URL - STRICT: no fallbacks
   * Supports: a.localhost, restaurant.example.com, etc.
   * Throws error if no tenant subdomain found
   */
  private _extractTenantFromUrl(): string {
    return this._urlUtils.extractTenantFromUrl();
  }

  /**
   * Check if token is expired or about to expire (within 30 seconds)
   */
  private _isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Math.floor(Date.now() / 1000);
      // Consider token expired if it expires within 30 seconds
      return payload.exp <= now + 30;
    } catch (error) {
      this._logger.error('Error checking token expiry:', error);
      return true; // Treat invalid tokens as expired
    }
  }
}
