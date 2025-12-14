import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { SocketService } from '../../services/socket.service';
import { RequestStateService } from '../../services/request-state.service';
import { ApiService } from '../../services/api.service';
import { LoggerService } from '../../services/logger.service';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { ServiceRequest, Table, RequestTypeConfig } from '../../models/types';
import { WaiterHeaderComponent } from './waiter-header/waiter-header.component';
import { LanguageService } from '../../services/language.service';
@Component({
  selector: 'app-waiter-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatBadgeModule,
    TranslateModule,
    WaiterHeaderComponent,
  ],
  templateUrl: './waiter-dashboard.component.html',
  styleUrls: ['./waiter-dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WaiterDashboardComponent implements OnInit, OnDestroy {
  // Inject services using modern Angular pattern
  private _socketService = inject(SocketService);
  private _requestState = inject(RequestStateService);
  private _apiService = inject(ApiService);
  private _logger = inject(LoggerService);
  private _translate = inject(TranslateService);
  private _languageService = inject(LanguageService);

  // Expose computed signals from state service
  pendingRequests = this._requestState.pendingRequests;
  inProgressRequests = this._requestState.acknowledgedRequests;

  // Table information cache
  tableInfo = signal<Map<string, Table>>(new Map());
  
  // Request types cache
  requestTypes = signal<RequestTypeConfig[]>([]);

  private _sub = new Subscription();

  ngOnInit(): void {
    // Don't pass tenantId - let joinWaiterRoom extract from URL subdomain
    // This ensures we use the same tenant identifier (subdomain) as the customer
    // The server broadcasts to tenant-{subdomain}-waiter, so we must join using subdomain
    this._socketService.joinWaiterRoom();

    // Load request types for proper display
    this._loadRequestTypes();

    // Load existing active requests from database
    this._loadExistingRequests();

    // Listen for new requests
    this._sub.add(
      this._socketService.on<ServiceRequest>('new_request').subscribe((request) => {
        this._logger.debug('Waiter dashboard received new_request:', request);
        this._requestState.addRequest(request);
        this._loadTableInfo(request.tableId);
        this._playNotificationSound();
      }),
    );

    // Listen for request updates
    this._sub.add(
      this._socketService.on<ServiceRequest>('request_updated').subscribe((updatedRequest) => {
        this._logger.debug('Waiter dashboard received request_updated:', updatedRequest);

        // If request is cancelled or completed, remove it from the list
        // Otherwise, update it
        if (updatedRequest.status === 'cancelled' || updatedRequest.status === 'completed') {
          this._requestState.removeRequest(updatedRequest.id);
          this._logger.debug(
            `Removed ${updatedRequest.status} request ${updatedRequest.id} from waiter dashboard`,
          );
        } else {
          this._requestState.updateRequest(updatedRequest);
          this._loadTableInfo(updatedRequest.tableId);
        }
      }),
    );
  }

  acknowledge(id: string): void {
    this._socketService.acknowledgeRequest(id);
  }

  complete(id: string): void {
    this._socketService.completeRequest(id);
  }
  private _playNotificationSound(): void {
    // Simple notification sound logic
    this._logger.debug('Playing notification sound for new request');
    console.log('Playing notification sound for new request');
    console.log('printing to printer for new request');
  }

  private _loadTableInfo(tableId: string): void {
    // Check if we already have this table info cached
    if (this.tableInfo().has(tableId)) {
      return;
    }

    // Collect all unique table IDs that need to be loaded
    this._loadTableInfoBatch([tableId]);
  }

  private _loadTableInfoBatch(tableIds: string[]): void {
    // Filter out already cached tables
    const uncachedIds = tableIds.filter(id => !this.tableInfo().has(id));
    
    if (uncachedIds.length === 0) {
      return;
    }

    // Batch fetch table info
    this._apiService.getTablesByIds(uncachedIds).subscribe({
      next: (tables) => {
        this.tableInfo.update((info) => {
          const newInfo = new Map(info);
          tables.forEach(table => newInfo.set(table.id, table));
          return newInfo;
        });
      },
      error: (error) => {
        this._logger.error('Failed to load table info for IDs:', uncachedIds, error);
      },
    });
  }
  private _loadExistingRequests(): void {
    this._apiService.getActiveRequestsFromDb().subscribe({
      next: (requests) => {
        this._logger.debug('Loaded existing active requests:', requests);
        // Clear any existing state and add loaded requests
        this._requestState.clearRequests();
        requests.forEach((request) => {
          this._requestState.addRequest(request);
        });

        // Batch load all table info at once
        const uniqueTableIds = [...new Set(requests.map(req => req.tableId))];
        if (uniqueTableIds.length > 0) {
          this._loadTableInfoBatch(uniqueTableIds);
        }
      },
      error: (error) => {
        this._logger.error('Failed to load existing requests:', error);
      },
    });
  }

  ngOnDestroy(): void {
    this._sub.unsubscribe();
    this._requestState.clearRequests();
  }

  private _loadRequestTypes(): void {
    // Use public endpoint since waiters don't have admin role
    this._apiService.getPublicRequestTypes().subscribe({
      next: (types) => {
        this._logger.debug('Loaded request types:', types);
        this.requestTypes.set(types);
        this._logger.debug('Request types cache updated, count:', types.length);
      },
      error: (error) => {
        this._logger.error('Failed to load request types:', error);
        this._logger.warn('Falling back to empty request types array');
        this.requestTypes.set([]);
      },
    });
  }

  // Helper method for template - returns bilingual request type label
  getRequestTypeLabel(requestTypeId: string): string {
    // Check if it's a UUID (new system)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestTypeId);
    
    if (isUUID) {
      const types = this.requestTypes();
      this._logger.debug(`Looking up UUID ${requestTypeId} in ${types.length} request types`);
      
      // Look up in request types
      const requestType = types.find(rt => rt.id === requestTypeId);
      if (requestType) {
        const currentLang = this._languageService.currentLocale;
        const label = currentLang === 'ar' ? requestType.nameAr : requestType.nameEn;
        this._logger.debug(`Found request type: ${label}`);
        return label;
      } else {
        this._logger.warn(`Request type ${requestTypeId} not found in cache`);
        // Return loading indicator while types are being fetched
        return types.length === 0 ? 'Loading...' : requestTypeId;
      }
    }
    
    // Fallback to legacy hardcoded translations for backward compatibility
    const translationKeys: Record<string, string> = {
      call_waiter: 'waiter.callWaiter',
      bill: 'waiter.requestBill',
      assistance: 'waiter.assistance',
      custom: 'waiter.customRequest',
    };
    const key = translationKeys[requestTypeId];
    return key ? this._translate.instant(key) : requestTypeId;
  }
  
  // Get icon for request type
  getRequestTypeIcon(requestTypeId: string): string {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(requestTypeId);
    
    if (isUUID) {
      const requestType = this.requestTypes().find(rt => rt.id === requestTypeId);
      if (requestType?.icon) {
        return requestType.icon;
      }
    }
    
    // Fallback icons for legacy types
    const iconMap: Record<string, string> = {
      call_waiter: 'notifications',
      bill: 'receipt',
      assistance: 'help',
      custom: 'message',
    };
    return iconMap[requestTypeId] || 'notifications';
  }

  // Helper method to get table display info
  getTableDisplayInfo(tableId: string) {
    const table = this.tableInfo().get(tableId);
    if (!table) {
      // Try to extract table number from UUID (last segment) as fallback
      const shortId = tableId.split('-').pop()?.substring(0, 8) || tableId;
      return { number: `#${shortId}`, name: null, zone: null, capacity: null };
    }
    return {
      number: table.tableNumber,
      name: table.name,
      zone: table.zone,
      capacity: table.capacity,
    };
  }
}
