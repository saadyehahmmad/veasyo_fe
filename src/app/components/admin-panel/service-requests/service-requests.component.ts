import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { LoggerService } from '../../../services/logger.service';
import { ServiceRequest } from '../../../models/types';

interface ServiceRequestResponse {
  data: ServiceRequest[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

@Component({
  selector: 'app-service-requests',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatPaginatorModule,
    MatChipsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    TranslateModule,
  ],
  templateUrl: './service-requests.component.html',
  styleUrls: ['./service-requests.component.scss'],
})
export class ServiceRequestsComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _snackBar = inject(MatSnackBar);
  private _fb = inject(FormBuilder);
  private _logger = inject(LoggerService);
  private _translate = inject(TranslateService);

  serviceRequests = signal<ServiceRequest[]>([]);
  loading = signal(false);
  dataSource = new MatTableDataSource<ServiceRequest>();
  requestColumns = [
    'tableName',
    'acknowledgedBy',
    'completedBy',
    'createdAt',
    'duration',
    'type',
    'status',
    'feedback',
    'action',
  ];
  
  // Feedback dialog
  selectedFeedback = signal<ServiceRequest | null>(null);

  // Pagination
  currentPage = signal(1);
  pageSize = signal(10);
  totalCount = signal(0);
  totalPages = signal(0);
  hasNext = signal(false);
  hasPrev = signal(false);

  // Filtering and sorting
  filterForm: FormGroup;
  sortBy = signal('timestampCreated');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Filter options
  statusOptions = [
    { value: '', label: this._translate.instant('admin.serviceRequests.allStatuses') },
    { value: 'pending', label: this._translate.instant('admin.serviceRequests.pending') },
    { value: 'acknowledged', label: this._translate.instant('admin.serviceRequests.acknowledged') },
    { value: 'completed', label: this._translate.instant('admin.serviceRequests.completed') },
    { value: 'cancelled', label: this._translate.instant('admin.serviceRequests.cancelled') },
  ];

  typeOptions = [
    { value: '', label: this._translate.instant('admin.serviceRequests.allTypes') },
    { value: 'call_waiter', label: this._translate.instant('admin.serviceRequests.callWaiter') },
    { value: 'bill', label: this._translate.instant('admin.serviceRequests.bill') },
    { value: 'assistance', label: this._translate.instant('admin.serviceRequests.assistance') },
    { value: 'custom', label: this._translate.instant('admin.serviceRequests.custom') },
  ];

  sortOptions = [
    { value: 'timestampCreated', label: this._translate.instant('admin.serviceRequests.createdTime') },
    { value: 'status', label: this._translate.instant('admin.serviceRequests.status') },
    { value: 'requestType', label: this._translate.instant('admin.serviceRequests.type') },
    { value: 'tableNumber', label: this._translate.instant('admin.serviceRequests.table') },
    { value: 'durationSeconds', label: this._translate.instant('admin.serviceRequests.duration') },
  ];

  constructor() {
    this.filterForm = this._fb.group({
      status: [''],
      type: [''],
    });
  }

  ngOnInit(): void {
    this.loadServiceRequests();

    // Watch for filter changes
    this.filterForm.valueChanges.subscribe(() => {
      this.currentPage.set(1); // Reset to first page when filtering
      this.loadServiceRequests();
    });
  }

  protected loadServiceRequests(): void {
    this.loading.set(true);

    const params = {
      page: this.currentPage(),
      limit: this.pageSize(),
      status: this.filterForm.get('status')?.value || undefined,
      type: this.filterForm.get('type')?.value || undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
    };

    // Remove undefined values
    Object.keys(params).forEach((key) => {
      if (params[key as keyof typeof params] === undefined) {
        delete params[key as keyof typeof params];
      }
    });

    this._apiService.getServiceRequests(params).subscribe({
      next: (response: ServiceRequestResponse) => {
        this.serviceRequests.set(response.data);
        this.dataSource.data = response.data;
        this.totalCount.set(response.pagination.totalCount);
        this.totalPages.set(response.pagination.totalPages);
        this.hasNext.set(response.pagination.hasNext);
        this.hasPrev.set(response.pagination.hasPrev);
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error loading service requests:', error);
        this._snackBar.open(this._translate.instant('admin.serviceRequests.loadFailed'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  // Pagination methods
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
      this.loadServiceRequests();
    }
  }
  nextPage(): void {
    if (this.hasNext()) {
      this.currentPage.update((p) => p + 1);
      this.loadServiceRequests();
    }
  }

  prevPage(): void {
    if (this.hasPrev()) {
      this.currentPage.update((p) => p - 1);
      this.loadServiceRequests();
    }
  }

  changePageSize(size: number): void {
    this.pageSize.set(size);
    this.currentPage.set(1);
    this.loadServiceRequests();
  }

  // Sorting methods
  toggleSort(column: string): void {
    if (this.sortBy() === column) {
      this.sortOrder.update((order) => (order === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortBy.set(column);
      this.sortOrder.set('desc');
    }
    this.loadServiceRequests();
  }

  getSortIcon(column: string): string {
    if (this.sortBy() !== column) return 'sort';
    return this.sortOrder() === 'asc' ? 'arrow_upward' : 'arrow_downward';
  }

  // Filter methods
  clearFilters(): void {
    this.filterForm.reset();
    this.sortBy.set('timestampCreated');
    this.sortOrder.set('desc');
    this.currentPage.set(1);
    this.loadServiceRequests();
  }

  getPageEnd(): number {
    const end = this.currentPage() * this.pageSize();
    return Math.min(end, this.totalCount());
  }

  updateRequestStatus(requestId: string, status: string, acknowledgedBy?: string): void {
    this.loading.set(true);

    let updateObservable;
    if (status === 'acknowledged' && acknowledgedBy) {
      updateObservable = this._apiService.acknowledgeServiceRequest(requestId, acknowledgedBy);
    } else if (status === 'completed') {
      updateObservable = this._apiService.completeServiceRequest(requestId);
    } else {
      updateObservable = this._apiService.updateServiceRequest(requestId, { status: status as any });
    }

    updateObservable.subscribe({
      next: (_updatedRequest) => {
        this._snackBar.open(this._translate.instant('admin.serviceRequests.statusUpdated'), 'Close', { duration: 3000 });
        this.loading.set(false);
        // Reload current page data
        this.loadServiceRequests();
      },
      error: (error) => {
        this._logger.error('Error updating request status:', error);
        this._snackBar.open(this._translate.instant('admin.serviceRequests.statusUpdateFailed'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  deleteServiceRequest(id: string): void {
    if (!confirm(this._translate.instant('admin.serviceRequests.confirmDelete'))) {
      return;
    }

    this.loading.set(true);
    this._apiService.deleteServiceRequest(id).subscribe({
      next: () => {
        this._snackBar.open(this._translate.instant('admin.serviceRequests.deleteSuccess'), 'Close', { duration: 3000 });
        this.loading.set(false);
        // Reload current page data
        this.loadServiceRequests();
      },
      error: (error) => {
        this._logger.error('Error deleting service request:', error);
        this._snackBar.open(this._translate.instant('admin.serviceRequests.deleteFailed'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }

  formatDate(date: Date | string): string {
    return new Date(date).toLocaleString();
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'pending':
        return 'orange';
      case 'acknowledged':
        return 'blue';
      case 'completed':
        return 'green';
      case 'cancelled':
        return 'red';
      default:
        return 'gray';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'pending':
        return 'schedule';
      case 'acknowledged':
        return 'check_circle';
      case 'completed':
        return 'done_all';
      case 'cancelled':
        return 'cancel';
      default:
        return 'info';
    }
  }

  getTypeIcon(typeOrRequest: string | ServiceRequest): string {
    // If it's a ServiceRequest object with enriched icon
    if (typeof typeOrRequest === 'object' && typeOrRequest.requestTypeIcon) {
      return typeOrRequest.requestTypeIcon;
    }
    
    const type = typeof typeOrRequest === 'string' ? typeOrRequest : typeOrRequest.requestType;
    
    switch (type) {
      case 'call_waiter':
        return 'person';
      case 'bill':
        return 'receipt';
      case 'assistance':
        return 'help';
      case 'custom':
        return 'note';
      default:
        return 'category';
    }
  }

  getTypeColor(type: string): string {
    switch (type) {
      case 'call_waiter':
        return 'primary';
      case 'bill':
        return 'accent';
      case 'assistance':
        return 'warn';
      case 'custom':
        return 'basic';
      default:
        return 'basic';
    }
  }

  getTypeLabel(typeOrRequest: string | ServiceRequest): string {
    // If it's a ServiceRequest object with enriched names
    if (typeof typeOrRequest === 'object' && (typeOrRequest.requestTypeNameEn || typeOrRequest.requestTypeNameAr)) {
      // Use English for now (can be made bilingual later)
      return typeOrRequest.requestTypeNameEn || typeOrRequest.requestTypeNameAr || typeOrRequest.requestType;
    }
    
    const type = typeof typeOrRequest === 'string' ? typeOrRequest : typeOrRequest.requestType;
    
    switch (type) {
      case 'call_waiter':
        return this._translate.instant('admin.serviceRequests.callWaiter');
      case 'bill':
        return this._translate.instant('admin.serviceRequests.billRequest');
      case 'assistance':
        return this._translate.instant('admin.serviceRequests.assistance');
      case 'custom':
        return this._translate.instant('admin.serviceRequests.custom');
      default:
        return type;
    }
  }

  getAcknowledgedBy(request: ServiceRequest): string {
    return request.acknowledgedByUser || this._translate.instant('admin.serviceRequests.notAcknowledged');
  }

  formatDuration(request: ServiceRequest): string {
    if (request.durationSeconds !== null && request.durationSeconds !== undefined) {
      const minutes = Math.floor(request.durationSeconds / 60);
      const seconds = request.durationSeconds % 60;
      return `${minutes}m ${seconds}s`;
    }
    return 'N/A';
  }

  getCompletedBy(request: ServiceRequest): string {
    if (!request.completedBy) {
      return 'N/A';
    }
    return request.completedBy === 'waiter' 
      ? this._translate.instant('admin.serviceRequests.completedByWaiter')
      : this._translate.instant('admin.serviceRequests.completedByCustomer');
  }

  getCompletedByIcon(completedBy?: 'waiter' | 'customer' | null): string {
    if (!completedBy) return 'help_outline';
    return completedBy === 'waiter' ? 'person' : 'person_outline';
  }

  getCompletedByColor(completedBy?: 'waiter' | 'customer' | null): string {
    if (!completedBy) return 'basic';
    return completedBy === 'waiter' ? 'primary' : 'accent';
  }

  hasFeedback(request: ServiceRequest): boolean {
    return request.feedbackRating !== undefined && request.feedbackRating !== null;
  }

  getFeedbackStars(rating?: number | null): string {
    if (!rating) return '';
    return '⭐'.repeat(rating);
  }

  getFeedbackTooltip(request: ServiceRequest): string {
    const parts: string[] = [];
    
    if (request.feedbackRating) {
      parts.push(`Rating: ${request.feedbackRating}/5 stars`);
    }
    
    if (request.feedbackComments) {
      parts.push(`Comments: ${request.feedbackComments}`);
    }
    
    if (request.feedbackCustomerName) {
      parts.push(`Name: ${request.feedbackCustomerName}`);
    }
    
    if (request.feedbackCustomerPhone) {
      parts.push(`Phone: ${request.feedbackCustomerPhone}`);
    }
    
    return parts.join('\n');
  }

  showFeedbackDetails(request: ServiceRequest): void {
    this.selectedFeedback.set(request);
  }

  closeFeedbackDetails(): void {
    this.selectedFeedback.set(null);
  }
}
