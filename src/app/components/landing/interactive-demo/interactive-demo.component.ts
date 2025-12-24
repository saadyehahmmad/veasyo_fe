import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { MatIconModule } from '@angular/material/icon';
import { FormsModule } from '@angular/forms';

interface ServiceRequest {
  id: number;
  tableNumber: string;
  type: string;
  typeIcon: string;
  status: 'pending' | 'acknowledged' | 'completed';
  timestamp: Date;
  customMessage?: string;
  completedBy?: 'customer' | 'waiter';
  rating?: number;
  feedbackNote?: string;
}

interface Table {
  id: number;
  number: string;
  capacity: number;
}

const REQUEST_STATUS_PENDING = 'pending' as const;
const REQUEST_STATUS_ACKNOWLEDGED = 'acknowledged' as const;
const REQUEST_STATUS_COMPLETED = 'completed' as const;
const REQUEST_TYPE_CUSTOM = 'Custom Request';

@Component({
  selector: 'app-interactive-demo',
  standalone: true,
  imports: [CommonModule, TranslateModule, MatIconModule, FormsModule],
  templateUrl: './interactive-demo.component.html',
  styleUrls: ['./interactive-demo.component.scss'],
})
export class InteractiveDemoComponent implements OnInit, OnDestroy {
  // Current view: 'customer' | 'waiter' | 'admin'
  currentView = signal<'customer' | 'waiter' | 'admin'>('customer');
  
  // Selected table for customer view
  selectedTable = signal<Table>({ id: 5, number: 'Table 5', capacity: 4 });
  
  // Service requests
  requests = signal<ServiceRequest[]>([
    {
      id: 1,
      tableNumber: 'Table 8',
      type: 'Request Bill',
      typeIcon: 'receipt',
      status: 'acknowledged',
      timestamp: new Date(Date.now() - 5 * 60000), // 5 minutes ago
    },
    {
      id: 2,
      tableNumber: 'Table 12',
      type: 'Water',
      typeIcon: 'water_drop',
      status: 'acknowledged',
      timestamp: new Date(Date.now() - 3 * 60000), // 3 minutes ago
    },
  ]);
  
  // Custom request input
  customRequest = signal('');
  showCustomRequestForm = signal(false);
  
  // Request types for customer view
  requestTypes = [
    { nameEn: 'Call Waiter', nameAr: 'استدعاء النادل', icon: 'person_raised_hand' },
    { nameEn: 'Request Bill', nameAr: 'طلب الفاتورة', icon: 'receipt' },
    { nameEn: 'Water', nameAr: 'ماء', icon: 'water_drop' },
    { nameEn: REQUEST_TYPE_CUSTOM, nameAr: 'طلب مخصص', icon: 'chat' },
  ];
  
  // Computed values
  pendingRequests = computed(() => 
    this.requests().filter(r => r.status === REQUEST_STATUS_PENDING)
  );
  
  acknowledgedRequests = computed(() => 
    this.requests().filter(r => r.status === REQUEST_STATUS_ACKNOWLEDGED)
  );
  
  completedRequests = computed(() => 
    this.requests().filter(r => r.status === REQUEST_STATUS_COMPLETED)
  );
  
  // Animation state
  showNotification = signal(false);
  notificationMessage = signal('');
  
  // Printer receipt state
  showPrinterReceipt = signal(false);
  printedRequest = signal<ServiceRequest | null>(null);
  
  // Customer feedback state
  showFeedbackForm = signal(false);
  feedbackRequest = signal<ServiceRequest | null>(null);
  feedbackRating = signal(0);
  feedbackNote = signal('');
  
  // Active requests for current table
  activeCustomerRequests = computed(() => 
    this.requests().filter(r => 
      r.tableNumber === this.selectedTable().number && 
      r.status !== REQUEST_STATUS_COMPLETED
    )
  );
  
  private requestIdCounter = 3;
  
  constructor(private translate: TranslateService) {}
  
  ngOnInit(): void {
    // Auto-demo: simulate some activity
    this.startAutoDemo();
  }
  
  ngOnDestroy(): void {
    // Cleanup if needed
  }
  
  switchView(view: 'customer' | 'waiter' | 'admin'): void {
    this.currentView.set(view);
  }
  
  sendRequest(requestType: any): void {
    if (requestType.nameEn === REQUEST_TYPE_CUSTOM) {
      this.showCustomRequestForm.set(true);
      return;
    }
    
    const newRequest: ServiceRequest = {
      id: this.requestIdCounter++,
      tableNumber: this.selectedTable().number,
      type: requestType.nameEn,
      typeIcon: requestType.icon,
      status: REQUEST_STATUS_PENDING,
      timestamp: new Date(),
    };
    
    this.requests.update(reqs => [newRequest, ...reqs]);
    this.showNotificationMessage(
      this.translate.instant('snackbar.requestSent')
    );
    
    // Show printer receipt animation
    this.showPrinterAnimation(newRequest);
    
    // Auto-switch to waiter view after 1 second to show the flow
    setTimeout(() => {
      if (this.currentView() === 'customer') {
        this.switchView('waiter');
      }
    }, 1500);
  }
  
  sendCustomRequest(): void {
    const message = this.customRequest();
    if (!message.trim()) {
      this.showNotificationMessage(
        this.translate.instant('snackbar.enterMessage')
      );
      return;
    }
    
    const newRequest: ServiceRequest = {
      id: this.requestIdCounter++,
      tableNumber: this.selectedTable().number,
      type: REQUEST_TYPE_CUSTOM,
      typeIcon: 'chat',
      status: REQUEST_STATUS_PENDING,
      timestamp: new Date(),
      customMessage: message,
    };
    
    this.requests.update(reqs => [newRequest, ...reqs]);
    this.customRequest.set('');
    this.showCustomRequestForm.set(false);
    this.showNotificationMessage(
      this.translate.instant('snackbar.requestSent')
    );
    
    // Show printer receipt animation
    this.showPrinterAnimation(newRequest);
    
    // Auto-switch to waiter view
    setTimeout(() => {
      if (this.currentView() === 'customer') {
        this.switchView('waiter');
      }
    }, 1500);
  }
  
  acknowledgeRequest(request: ServiceRequest): void {
    this.requests.update(reqs =>
      reqs.map(r => (r.id === request.id ? { ...r, status: REQUEST_STATUS_ACKNOWLEDGED } : r))
    );
    this.showNotificationMessage('Request acknowledged!');
    
    // If it's the current table's request and we're in customer view, show feedback option
    if (request.tableNumber === this.selectedTable().number) {
      setTimeout(() => {
        if (this.currentView() === 'waiter') {
          this.switchView('customer');
        }
      }, 2000);
    }
  }
  
  completeRequest(request: ServiceRequest): void {
    this.requests.update(reqs =>
      reqs.map(r => (r.id === request.id ? { 
        ...r, 
        status: REQUEST_STATUS_COMPLETED,
        completedBy: 'waiter' as const
      } : r))
    );
    this.showNotificationMessage('Request completed!');
    
    // Close feedback form if it was open for this request
    if (this.feedbackRequest()?.id === request.id) {
      this.closeFeedbackForm();
    }
  }
  
  openFeedbackForm(request: ServiceRequest): void {
    this.feedbackRequest.set(request);
    this.feedbackRating.set(0);
    this.feedbackNote.set('');
    this.showFeedbackForm.set(true);
  }
  
  closeFeedbackForm(): void {
    this.showFeedbackForm.set(false);
    setTimeout(() => {
      this.feedbackRequest.set(null);
      this.feedbackRating.set(0);
      this.feedbackNote.set('');
    }, 300);
  }
  
  setRating(rating: number): void {
    this.feedbackRating.set(rating);
  }
  
  submitFeedback(): void {
    const request = this.feedbackRequest();
    if (!request) return;
    
    // Complete the request with feedback
    this.requests.update(reqs =>
      reqs.map(r => (r.id === request.id ? { 
        ...r, 
        status: REQUEST_STATUS_COMPLETED,
        completedBy: 'customer' as const,
        rating: this.feedbackRating(),
        feedbackNote: this.feedbackNote() || undefined
      } : r))
    );
    
    this.showNotificationMessage(
      this.translate.instant('customer.thankYouFeedback')
    );
    this.closeFeedbackForm();
  }
  
  skipFeedback(): void {
    const request = this.feedbackRequest();
    if (!request) return;
    
    // Complete the request without feedback
    this.requests.update(reqs =>
      reqs.map(r => (r.id === request.id ? { 
        ...r, 
        status: REQUEST_STATUS_COMPLETED,
        completedBy: 'customer' as const
      } : r))
    );
    
    this.showNotificationMessage(
      this.translate.instant('snackbar.requestCompleted')
    );
    this.closeFeedbackForm();
  }
  
  deleteRequest(request: ServiceRequest): void {
    this.requests.update(reqs => reqs.filter(r => r.id !== request.id));
    this.showNotificationMessage('Request deleted');
  }
  
  getTimeSince(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
  
  getDuration(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  }
  
  private showNotificationMessage(message: string): void {
    this.notificationMessage.set(message);
    this.showNotification.set(true);
    setTimeout(() => {
      this.showNotification.set(false);
    }, 3000);
  }
  
  private showPrinterAnimation(request: ServiceRequest): void {
    // Show printer receipt with animation
    this.printedRequest.set(request);
    this.showPrinterReceipt.set(true);
    
    // Hide after 4 seconds
    setTimeout(() => {
      this.showPrinterReceipt.set(false);
      setTimeout(() => {
        this.printedRequest.set(null);
      }, 500); // Wait for fade-out animation
    }, 4000);
  }
  
  private startAutoDemo(): void {
    // Simulate real-time updates every 10 seconds
    setInterval(() => {
      // Update timestamps for existing requests
      this.requests.update(reqs => [...reqs]);
    }, 10000);
  }
  
  formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  }
  
  get currentLang(): string {
    return this.translate.currentLang || 'en';
  }
}

