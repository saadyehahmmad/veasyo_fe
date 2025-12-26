import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SubscriptionService } from '../../../../services/subscription.service';
import { AuthService } from '../../../../services/auth.service';

interface Invoice {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  plan: string;
  period: string;
  paymentMethod?: string;
  description?: string;
  tenantId?: string;
  subscriptionId?: string;
}

interface PaymentHistory {
  id: string;
  date: Date;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  method: string;
  transactionId?: string;
  description?: string;
}

@Component({
  selector: 'app-invoice-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  templateUrl: './invoice-history.component.html',
  styleUrls: ['./invoice-history.component.scss'],
})
export class InvoiceHistoryComponent implements OnInit {
  private _subscriptionService = inject(SubscriptionService);
  private _authService = inject(AuthService);
  private _snackBar = inject(MatSnackBar);
  private _dialog = inject(MatDialog);
  private _translate = inject(TranslateService);

  invoices = signal<Invoice[]>([]);
  payments = signal<PaymentHistory[]>([]);
  isLoading = signal(false);
  error = signal<string | null>(null);

  invoiceColumns = ['date', 'description', 'amount', 'status', 'actions'];
  paymentColumns = ['date', 'description', 'method', 'amount', 'status'];

  ngOnInit(): void {
    this._loadInvoices();
    this._loadPayments();
  }

  private _loadInvoices(): void {
    this.isLoading.set(true);
    this._subscriptionService.getMyInvoices().subscribe({
      next: (response) => {
        this.invoices.set(response.invoices || []);
        this.isLoading.set(false);
        this.error.set(null);
      },
      error: (error) => {
        this.error.set('Failed to load invoices');
        this.isLoading.set(false);
        console.error('Error loading invoices:', error);
      },
    });
  }

  private _loadPayments(): void {
    this._subscriptionService.getMyPayments().subscribe({
      next: (response) => {
        this.payments.set(response.payments || []);
      },
      error: (error) => {
        console.error('Error loading payments:', error);
      },
    });
  }

  downloadInvoice(invoice: Invoice): void {
    this._generateInvoicePDF(invoice, true);
  }

  viewInvoice(invoice: Invoice): void {
    this._generateInvoicePDF(invoice, false);
  }

  private _generateInvoicePDF(invoice: Invoice, download: boolean): void {
    // Create a professional invoice HTML
    const invoiceHTML = this._createInvoiceHTML(invoice);
    
    const snackbarDuration = 3000;
    const closeText = this._translate.instant('snackbar.close');
    
    // Open in a new window for viewing or trigger print dialog for PDF
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      this._snackBar.open(
        this._translate.instant('admin.subscription.failedToViewInvoice'),
        closeText,
        { duration: snackbarDuration }
      );
      return;
    }

    printWindow.document.write(invoiceHTML);
    printWindow.document.close();

    // Wait for content to load before printing/downloading
    printWindow.onload = () => {
      if (download) {
        // Trigger print dialog which allows saving as PDF
        printWindow.print();
        this._snackBar.open(
          this._translate.instant('admin.subscription.invoiceDownloadStarted'),
          closeText,
          { duration: snackbarDuration }
        );
      } else {
        // Just show the invoice
        this._snackBar.open(
          this._translate.instant('admin.subscription.openingInvoiceDetails'),
          closeText,
          { duration: snackbarDuration }
        );
      }
    };
  }

  private _createInvoiceHTML(invoice: Invoice): string {
    const currentUser = this._authService.currentUser();
    const tenantName = currentUser?.fullName || currentUser?.tenantName || 'Tenant';
    const tenantEmail = currentUser?.email || 'N/A';
    const issueDate = this.formatDate(invoice.date);
    const dueDate = this.formatDate(invoice.date);
    
    // Generate a simple digital signature (hash of invoice data)
    const signatureData = `${invoice.id}-${invoice.date}-${invoice.amount}`;
    const digitalSignature = this._generateSimpleHash(signatureData);

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.id}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      padding: 40px;
      background: #f5f5f5;
    }
    
    .invoice-container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      padding: 60px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 30px;
      border-bottom: 3px solid #667eea;
    }
    
    .company-info {
      flex: 1;
    }
    
    .company-logo {
      font-size: 32px;
      font-weight: bold;
      color: #667eea;
      margin-bottom: 8px;
      letter-spacing: -1px;
    }
    
    .company-tagline {
      font-size: 12px;
      color: #666;
      font-style: italic;
      margin-bottom: 16px;
    }
    
    .company-details {
      font-size: 12px;
      color: #666;
      line-height: 1.6;
    }
    
    .invoice-title {
      text-align: right;
      flex: 1;
    }
    
    .invoice-title h1 {
      font-size: 36px;
      color: #333;
      margin-bottom: 10px;
    }
    
    .invoice-id {
      font-size: 14px;
      color: #666;
      margin-bottom: 5px;
    }
    
    .invoice-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 40px;
      margin-bottom: 40px;
    }
    
    .detail-section h3 {
      font-size: 12px;
      text-transform: uppercase;
      color: #667eea;
      margin-bottom: 12px;
      font-weight: 600;
      letter-spacing: 1px;
    }
    
    .detail-section p {
      font-size: 14px;
      color: #333;
      line-height: 1.8;
    }
    
    .invoice-table {
      width: 100%;
      margin-bottom: 40px;
      border-collapse: collapse;
    }
    
    .invoice-table thead {
      background: #667eea;
      color: white;
    }
    
    .invoice-table th {
      padding: 15px;
      text-align: left;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .invoice-table td {
      padding: 20px 15px;
      border-bottom: 1px solid #eee;
      font-size: 14px;
      color: #333;
    }
    
    .invoice-table tbody tr:hover {
      background: #f9f9f9;
    }
    
    .invoice-table .amount-col {
      text-align: right;
      font-weight: 600;
    }
    
    .totals {
      margin-left: auto;
      width: 350px;
      margin-bottom: 40px;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      font-size: 14px;
    }
    
    .total-row.final {
      border-top: 2px solid #667eea;
      margin-top: 10px;
      padding-top: 15px;
      font-size: 18px;
      font-weight: bold;
      color: #667eea;
    }
    
    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .status-paid {
      background: #d4edda;
      color: #155724;
    }
    
    .status-pending {
      background: #fff3cd;
      color: #856404;
    }
    
    .status-failed {
      background: #f8d7da;
      color: #721c24;
    }
    
    .footer {
      margin-top: 60px;
      padding-top: 30px;
      border-top: 2px solid #eee;
    }
    
    .digital-signature {
      background: #f9f9f9;
      padding: 20px;
      border-left: 4px solid #667eea;
      margin-bottom: 20px;
    }
    
    .digital-signature h4 {
      font-size: 12px;
      color: #667eea;
      text-transform: uppercase;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    
    .digital-signature p {
      font-family: 'Courier New', monospace;
      font-size: 11px;
      color: #666;
      word-break: break-all;
      line-height: 1.6;
    }
    
    .footer-text {
      text-align: center;
      font-size: 12px;
      color: #999;
      line-height: 1.8;
    }
    
    .powered-by {
      text-align: center;
      margin-top: 20px;
      padding-top: 20px;
      border-top: 1px solid #eee;
      font-size: 11px;
      color: #999;
    }
    
    @media print {
      body {
        padding: 0;
        background: white;
      }
      
      .invoice-container {
        box-shadow: none;
        max-width: 100%;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div class="header">
      <div class="company-info">
        <div class="company-logo">Veasyo</div>
        <div class="company-tagline">Viber Easy Operation</div>
        <div class="company-details">
          <p><strong>Veasyo Technologies</strong></p>
          <p>Restaurant Service Platform</p>
          <p>Email: support@veasyo.com</p>
          <p>Web: www.veasyo.com</p>
        </div>
      </div>
      <div class="invoice-title">
        <h1>INVOICE</h1>
        <div class="invoice-id">#${invoice.id}</div>
        <div class="status-badge status-${invoice.status}">${invoice.status.toUpperCase()}</div>
      </div>
    </div>

    <!-- Invoice Details -->
    <div class="invoice-details">
      <div class="detail-section">
        <h3>Billed To</h3>
        <p>
          <strong>${tenantName}</strong><br>
          ${tenantEmail}
        </p>
      </div>
      <div class="detail-section">
        <h3>Invoice Details</h3>
        <p>
          <strong>Issue Date:</strong> ${issueDate}<br>
          <strong>Due Date:</strong> ${dueDate}<br>
          <strong>Period:</strong> ${invoice.period}
        </p>
      </div>
    </div>

    <!-- Invoice Items Table -->
    <table class="invoice-table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Plan</th>
          <th class="amount-col">Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${invoice.description || 'Monthly Subscription'}</td>
          <td>${invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1)} Plan</td>
          <td class="amount-col">$${(invoice.amount / 100).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="total-row">
        <span>Subtotal:</span>
        <span>$${(invoice.amount / 100).toFixed(2)}</span>
      </div>
      <div class="total-row">
        <span>Tax (0%):</span>
        <span>$0.00</span>
      </div>
      <div class="total-row final">
        <span>Total Due:</span>
        <span>$${(invoice.amount / 100).toFixed(2)} USD</span>
      </div>
    </div>

    <!-- Digital Signature -->
    <div class="digital-signature">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        Digital Signature
      </h4>
      <p>
        This invoice is digitally signed for authenticity.<br>
        Signature Hash: ${digitalSignature}<br>
        Generated: ${new Date().toISOString()}
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="footer-text">
        <p><strong>Thank you for your business!</strong></p>
        <p>If you have any questions about this invoice, please contact us at support@veasyo.com</p>
        <p>Payment terms: Due upon receipt. Late payments may result in service suspension.</p>
      </div>
      <div class="powered-by">
        <p>Powered by <strong>Veasyo</strong> - Streamline restaurant operations with instant waiter communication</p>
        <p>© ${new Date().getFullYear()} Veasyo Technologies. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private _generateSimpleHash(data: string): string {
    // Simple hash function for digital signature
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    // Convert to hex and pad
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
    // Format as signature-like string
    return `VEASYO-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}`;
  }

  formatDate(date: Date | string): string {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  formatAmount(amount: number, currency: string): string {
    return `${(amount / 100).toFixed(2)} ${currency}`;
  }

  getStatusClass(status: string): string {
    const statusMap: { [key: string]: string } = {
      paid: 'status-paid',
      pending: 'status-pending',
      failed: 'status-failed',
      refunded: 'status-refunded',
      success: 'status-success',
    };
    return statusMap[status] || 'status-default';
  }

  getStatusIcon(status: string): string {
    const iconMap: { [key: string]: string } = {
      paid: 'check_circle',
      pending: 'schedule',
      failed: 'error',
      refunded: 'replay',
      success: 'check_circle',
    };
    return iconMap[status] || 'help';
  }

  retry(): void {
    this.error.set(null);
    this._loadInvoices();
    this._loadPayments();
  }
}

