import {
  Component,
  OnInit,
  OnDestroy,
  signal,
  computed,
  ChangeDetectionStrategy,
  inject,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { SocketService } from '../../services/socket.service';
import { CustomerStateService } from '../../services/customer-state.service';
import { ApiService } from '../../services/api.service';
import { UrlUtilsService } from '../../services/url-utils.service';
import { LoggerService } from '../../services/logger.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { SnackbarService } from '../../services/snackbar.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ServiceRequest, RequestType, Table, RequestTypeConfig } from '../../models/types';
import { CustomerHeaderComponent } from './customer-header/customer-header.component';
import { CustomerFooterComponent } from './customer-footer/customer-footer.component';
import { LanguageService } from '../../services/language.service';

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    CustomerHeaderComponent,
    CustomerFooterComponent,
    TranslateModule,
  ],
  templateUrl: './customer.component.html',
  styleUrls: ['./customer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerComponent implements OnInit, OnDestroy {
  // Inject services
  private _route = inject(ActivatedRoute);
  private _socketService = inject(SocketService);
  private _snackbar = inject(SnackbarService);
  private _customerState = inject(CustomerStateService);
  private _apiService = inject(ApiService);
  private _urlUtils = inject(UrlUtilsService);
  private _logger = inject(LoggerService);
  private _translate = inject(TranslateService);
  private _languageService = inject(LanguageService);

  // Translation keys - constants to avoid duplication
  private readonly WAITER_COMING_KEY = 'customer.waiterIsComing';
  private readonly REQUEST_SENT_KEY = 'customer.requestSent';

  // Local signals
  isLoading = signal<boolean>(false);
  customMessage = signal<string>('');
  showCustomInput = signal<boolean>(false);
  tableInfo = signal<Table | null>(null);
  tableNotFound = signal<boolean>(false);
  timerSeconds = signal<number>(0); // Timer in seconds
  requestTypes = signal<RequestTypeConfig[]>([]); // Dynamic request types
  menuUrl = signal<string>(''); // Menu URL - loaded from tenant settings
  customRequestEnabled = signal<boolean>(true); // Custom request enabled - loaded from tenant settings

  // Use state service signals
  tableId = this._customerState.tableId;
  requestStatus = this._customerState.requestStatus;
  currentRequestId = this._customerState.currentRequestId;

  // Computed signals
  hasActiveRequest = computed(() => this.requestStatus() !== '');
  // Check if waiter is coming by comparing with translated status message
  isWaiterComing = computed(() => {
    const translatedStatus = this._translate.instant(this.WAITER_COMING_KEY);
    return this.requestStatus() === translatedStatus || this.requestStatus() === 'Waiter is coming!';
  });
  tableDisplay = computed(() => {
    const table = this.tableInfo();
    if (!table) return null;
    return {
      number: table.tableNumber,
      name: table.name,
      zone: table.zone,
      capacity: table.capacity,
    };
  });
  // Format timer as MM:SS
  timerDisplay = computed(() => {
    const seconds = this.timerSeconds();
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  });

  private _sub = new Subscription();
  private _timerInterval: any = null; // Store interval reference for timer

  ngOnInit(): void {
    // Get table ID from route
    this._sub.add(
      this._route.paramMap.subscribe((params) => {
        const id = params.get('id');
        if (id) {
          const tableId = id; // UUID string
          this._customerState.tableId.set(tableId);

          // Fetch table info from backend
          this._fetchTableInfo(tableId);
          
          // Fetch request types
          this._fetchRequestTypes();
          
          // Load menu URL from tenant settings
          this._loadMenuUrl();

          try {
            const tenantId = this._getTenantFromUrl();
            this._socketService.joinTable(tableId, tenantId);
          } catch (error) {
            this._logger.error('Failed to extract tenant subdomain:', error);
            this._snackbar.error('snackbar.tenantSubdomainRequired');
          }

          // Check if there's a saved state for this table
          const savedState = this._customerState.getState();
          if (savedState.currentRequestId && savedState.tableId === tableId) {
            this._logger.debug('Restored customer state from session storage');
            this._snackbar.info('snackbar.previousRequestActive', undefined, {
              duration: 3000,
            });
          }
        }
      }),
    );

    // Listen for request sent confirmation
    this._sub.add(
      this._socketService.on<ServiceRequest>('request_sent').subscribe((data) => {
        // Update state service
        this._customerState.setRequest(data.id, data.requestType, data.customNote);
        // Use translated status message
        const statusMessage = this._translate.instant(this.REQUEST_SENT_KEY);
        this._customerState.updateStatus(statusMessage);

        this.isLoading.set(false);
        this.showCustomInput.set(false);
        this._snackbar.success('snackbar.requestSent');
        
        // Start timer when request is sent
        this._startTimer();
      }),
    );

    // Listen for request status updates
    this._sub.add(
      this._socketService.on<ServiceRequest>('request_status').subscribe((data) => {
        if (data.status === 'acknowledged') {
          // Use translated status message
          const statusMessage = this._translate.instant(this.WAITER_COMING_KEY);
          this._customerState.updateStatus(statusMessage);
          this._snackbar.info(this.WAITER_COMING_KEY, undefined, {
            duration: 5000,
          });
        } else if (data.status === 'completed') {
          this._customerState.completeRequest();
          this._stopTimer();
          this._snackbar.success('snackbar.requestCompleted');
        }
      }),
    );
  }

  sendRequest(type: string): void {
    const currentTableId = this.tableId();
    if (currentTableId && !this.isLoading()) {
      this.isLoading.set(true);
      this._logger.debug('Customer sending request:', { tableId: currentTableId, type });
      this._socketService.callWaiter(currentTableId, type as RequestType);
    }
  }

  toggleCustomInput(): void {
    this.showCustomInput.update((v) => !v);
  }

  sendCustomRequest(): void {
    const message = this.customMessage();
    if (!message.trim()) {
      this._snackbar.warning('snackbar.enterMessage');
      return;
    }

    const currentTableId = this.tableId();
    if (currentTableId && !this.isLoading()) {
      this.isLoading.set(true);
      this._socketService.callWaiter(currentTableId, 'custom', message);
      this.customMessage.set('');
    }
  }

  cancelRequest(): void {
    const requestId = this.currentRequestId();
    if (requestId) {
      this._socketService.cancelRequest(requestId);
      this._customerState.completeRequest();
      this._stopTimer();
      this._snackbar.info('snackbar.requestCancelled');
    }
  }

  completeRequest(): void {
    const requestId = this.currentRequestId();
    if (requestId) {
      this._socketService.completeRequest(requestId);
      this._customerState.completeRequest();
      this._stopTimer();
      this._snackbar.success('snackbar.requestCompleted');
    }
  }

  ngOnDestroy(): void {
    this._sub.unsubscribe();
    // Clean up timer interval
    this._stopTimer();
    this._socketService.disconnect();
  }

  private _fetchTableInfo(tableId: string): void {
    this.isLoading.set(true);
    this._logger.debug('Fetching table info for table ID:', tableId);

    this._apiService.getTableById(tableId).subscribe({
      next: (table: Table) => {
        this._logger.debug('Fetched table info:', table);
        this.tableInfo.set(table);
        this.tableNotFound.set(false);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        this._logger.error('Error fetching table info:', error);
        this.tableNotFound.set(true);
        this.isLoading.set(false);
        if (error.status === 404) {
          this._snackbar.error('snackbar.tableNotFound');
        } else {
          this._snackbar.error('snackbar.failedToLoadTable');
        }
      },
    });
  }

  private _fetchRequestTypes(): void {
    this._apiService.getPublicRequestTypes().subscribe({
      next: (types) => {
        this._logger.debug('Fetched request types:', types);
        this.requestTypes.set(types);
      },
      error: (error) => {
        this._logger.error('Error fetching request types:', error);
        // Fallback to empty array - no need to show error to customer
        this.requestTypes.set([]);
      },
    });
  }

  getRequestTypeName(requestType: RequestTypeConfig): string {
    const currentLang = this._languageService.currentLocale;
    return currentLang === 'ar' ? requestType.nameAr : requestType.nameEn;
  }

  private _getTenantFromUrl(): string {
    return this._urlUtils.extractTenantFromUrl();
  }

  // Load menu URL and custom request setting from tenant branding/settings
  private _loadMenuUrl(): void {
    try {
      const subdomain = this._getTenantFromUrl();
      // Use public tenant branding endpoint
      this._apiService.getTenantBranding(subdomain).subscribe({
        next: (branding: any) => {
          // Menu URL comes directly from branding.menuUrl
          const url = branding?.menuUrl;
          if (url && url.trim() !== '') {
            this.menuUrl.set(url.trim());
            this._logger.debug('Menu URL loaded:', url);
          } else {
            this.menuUrl.set('');
            this._logger.debug('No menu URL configured');
          }
          
          // Custom request enabled comes from settings
          const enabled = branding?.settings?.customRequestEnabled;
          this.customRequestEnabled.set(enabled !== undefined ? enabled : true); // Default to enabled
          this._logger.debug('Custom request enabled:', this.customRequestEnabled());
        },
        error: (error) => {
          // Silently fail - menu URL and custom request are optional
          this._logger.debug('Could not load tenant settings:', error);
          this.menuUrl.set('');
          this.customRequestEnabled.set(true); // Default to enabled
        },
      });
    } catch (error) {
      // Silently fail if tenant subdomain cannot be extracted
      this._logger.debug('Could not extract tenant subdomain for settings:', error);
      this.menuUrl.set('');
      this.customRequestEnabled.set(true); // Default to enabled
    }
  }

  // Start the timer when a request is sent
  private _startTimer(): void {
    // Reset timer to 0 and start counting
    this.timerSeconds.set(0);
    // Clear any existing interval
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
    }
    // Start new interval that increments every second
    this._timerInterval = setInterval(() => {
      this.timerSeconds.update((seconds) => seconds + 1);
    }, 1000);
  }

  // Stop and reset the timer
  private _stopTimer(): void {
    if (this._timerInterval) {
      clearInterval(this._timerInterval);
      this._timerInterval = null;
    }
    this.timerSeconds.set(0);
  }
}
