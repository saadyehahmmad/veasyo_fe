import { Injectable, signal, effect, inject } from '@angular/core';
import { LoggerService } from './logger.service';

export interface CustomerState {
  tableId: string | null; // Changed from number to string (UUID)
  currentRequestId: string | null;
  requestStatus: string;
  requestType: string | null;
  customNote: string | null;
  timestamp: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerStateService {
  private readonly _STORAGE_KEY = 'waiter_customer_state';
  private readonly _STATE_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes
  private _initialized = false;
  private _logger = inject(LoggerService);

  // Signals for reactive state
  tableId = signal<string | null>(null); // Changed from number to string (UUID)
  currentRequestId = signal<string | null>(null);
  requestStatus = signal<string>('');
  requestType = signal<string | null>(null);
  customNote = signal<string | null>(null);
  timestamp = signal<number | null>(null);

  constructor() {
    // Load state from session storage on initialization
    this._loadState();

    // Mark as initialized after loading
    this._initialized = true;

    // Auto-save state whenever it changes
    effect(() => {
      const state: CustomerState = {
        tableId: this.tableId(),
        currentRequestId: this.currentRequestId(),
        requestStatus: this.requestStatus(),
        requestType: this.requestType(),
        customNote: this.customNote(),
        timestamp: this.timestamp(),
      };

      // Save if there's an active request
      if (state.currentRequestId) {
        this._saveState(state);
      } else if (this._initialized) {
        // Only clear storage after initialization if there's no active request
        // This prevents clearing during the initial load
        try {
          sessionStorage.removeItem(this._STORAGE_KEY);
        } catch (error) {
          this._logger.error('Error clearing session storage:', error);
        }
      }
    });
  }

  /**
   * Load state from session storage
   */
  private _loadState(): void {
    try {
      const stored = sessionStorage.getItem(this._STORAGE_KEY);
      if (!stored) {
        return;
      }

      const state: CustomerState = JSON.parse(stored);

      // Check if state is expired
      if (state.timestamp && Date.now() - state.timestamp > this._STATE_EXPIRY_MS) {
        this._logger.debug('Customer state expired, clearing...');
        this.clearRequestState();
        return;
      }

      // Restore state to signals
      if (state.tableId) this.tableId.set(state.tableId);
      if (state.currentRequestId) this.currentRequestId.set(state.currentRequestId);
      if (state.requestStatus) this.requestStatus.set(state.requestStatus);
      if (state.requestType) this.requestType.set(state.requestType);
      if (state.customNote) this.customNote.set(state.customNote);
      if (state.timestamp) this.timestamp.set(state.timestamp);

      this._logger.debug('Customer state loaded from session storage:', state);
    } catch (error) {
      this._logger.error('Error loading customer state:', error);
      this.clearRequestState();
    }
  }

  /**
   * Save state to session storage
   */
  private _saveState(state: CustomerState): void {
    try {
      sessionStorage.setItem(this._STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      this._logger.error('Error saving customer state:', error);
    }
  }

  /**
   * Clear all state (including table ID)
   */
  clearState(): void {
    this.tableId.set(null);
    this.currentRequestId.set(null);
    this.requestStatus.set('');
    this.requestType.set(null);
    this.customNote.set(null);
    this.timestamp.set(null);

    try {
      sessionStorage.removeItem(this._STORAGE_KEY);
    } catch (error) {
      this._logger.error('Error clearing customer state:', error);
    }
  }

  /**
   * Clear only request state (preserve table ID)
   */
  clearRequestState(): void {
    this.currentRequestId.set(null);
    this.requestStatus.set('');
    this.requestType.set(null);
    this.customNote.set(null);
    this.timestamp.set(null);

    try {
      sessionStorage.removeItem(this._STORAGE_KEY);
    } catch (error) {
      this._logger.error('Error clearing customer state:', error);
    }
  }

  /**
   * Set a new request
   */
  setRequest(requestId: string, type: string, customNote?: string): void {
    this.currentRequestId.set(requestId);
    this.requestType.set(type);
    this.customNote.set(customNote || null);
    this.timestamp.set(Date.now());
  }

  /**
   * Update request status
   */
  updateStatus(status: string): void {
    this.requestStatus.set(status);
  }

  /**
   * Complete request and clear request state (preserve table ID)
   */
  completeRequest(): void {
    this.clearRequestState();
  }

  /**
   * Check if there's an active request
   */
  hasActiveRequest(): boolean {
    return this.currentRequestId() !== null && this.requestStatus() !== '';
  }

  /**
   * Get the current state as an object
   */
  getState(): CustomerState {
    return {
      tableId: this.tableId(),
      currentRequestId: this.currentRequestId(),
      requestStatus: this.requestStatus(),
      requestType: this.requestType(),
      customNote: this.customNote(),
      timestamp: this.timestamp(),
    };
  }
}
