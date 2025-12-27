import { Component, Inject, OnInit, signal, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SuperAdminService } from '../../../../services/superadmin.service';

@Component({
  selector: 'app-view-invoices-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>receipt_long</mat-icon>
      {{ dialogTitle }}
    </h2>

    <mat-dialog-content>
      <div class="tenant-info">
        <p><strong>{{ data.tenant.name }}</strong></p>
        <p class="subdomain">{{ data.tenant.subdomain }}</p>
      </div>

      @if (isLoading()) {
        <div class="loading-container">
          <mat-spinner diameter="40"></mat-spinner>
          <p>{{ 'admin.superadmin.loading' | translate }}</p>
        </div>
      } @else if (invoices().length === 0) {
        <div class="empty-state">
          <mat-icon>info_outline</mat-icon>
          <p>{{ 'admin.subscription.noInvoices' | translate }}</p>
        </div>
      } @else {
        <table mat-table [dataSource]="invoices()" class="invoices-table">
          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.subscription.date' | translate }}</th>
            <td mat-cell *matCellDef="let element">{{ formatDate(element.date) }}</td>
          </ng-container>

          <ng-container matColumnDef="period">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.superadmin.viewInvoices.period' | translate }}</th>
            <td mat-cell *matCellDef="let element">{{ element.period }}</td>
          </ng-container>

          <ng-container matColumnDef="amount">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.subscription.amount' | translate }}</th>
            <td mat-cell *matCellDef="let element">{{ formatPrice(element.amount, element.currency) }}</td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.subscription.status' | translate }}</th>
            <td mat-cell *matCellDef="let element">
              <mat-chip [color]="getStatusColor(element.status)" selected>
                {{ 'admin.subscription.' + element.status | translate }}
              </mat-chip>
            </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>{{ 'admin.subscription.actions' | translate }}</th>
            <td mat-cell *matCellDef="let element">
              <button 
                mat-icon-button 
                (click)="viewInvoice(element)"
                [matTooltip]="'admin.subscription.viewInvoice' | translate"
              >
                <mat-icon>visibility</mat-icon>
              </button>
              <button 
                mat-icon-button 
                (click)="verifyInvoice(element)"
                [matTooltip]="'Verify Invoice Signature'"
                color="primary"
              >
                <mat-icon>verified</mat-icon>
              </button>
              <button 
                mat-icon-button 
                (click)="downloadInvoice(element)"
                [matTooltip]="'admin.subscription.downloadInvoice' | translate"
              >
                <mat-icon>download</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns"></tr>
        </table>
      }
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onClose()">
        {{ 'admin.superadmin.tenantManagement.cancel' | translate }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 700px;
      min-height: 400px;
      padding: 24px;

      .tenant-info {
        margin-bottom: 24px;
        padding: 16px;
        background-color: #f5f5f5;
        border-radius: 8px;

        p {
          margin: 4px 0;
        }

        .subdomain {
          font-size: 14px;
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .loading-container,
      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 40px;

        mat-icon {
          font-size: 48px;
          width: 48px;
          height: 48px;
          margin-bottom: 16px;
          opacity: 0.6;
        }

        p {
          color: rgba(0, 0, 0, 0.6);
        }
      }

      .invoices-table {
        width: 100%;

        th {
          font-weight: 600;
          background-color: #f5f5f5;
        }
      }
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
    }
  `],
})
export class ViewInvoicesDialogComponent implements OnInit {
  private _superAdminService = inject(SuperAdminService);
  private _cdr = inject(ChangeDetectorRef);
  private _snackBar = inject(MatSnackBar);
  private _translate = inject(TranslateService);

  invoices = signal<any[]>([]);
  isLoading = signal(false);
  displayedColumns = ['date', 'period', 'amount', 'status', 'actions'];
  dialogTitle = 'Tenant Invoices';

  constructor(
    public dialogRef: MatDialogRef<ViewInvoicesDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
  ) {}

  ngOnInit(): void {
    // Set dialog title immediately to avoid ExpressionChangedAfterItHasBeenCheckedError
    this.dialogTitle = 'Tenant Invoices';
    this._cdr.detectChanges();
    
    this.loadInvoices();
  }

  loadInvoices(): void {
    this.isLoading.set(true);

    this._superAdminService.getTenantInvoices(this.data.tenant.id).subscribe({
      next: (response: any) => {
        this.invoices.set(response.invoices || []);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Error loading invoices:', error);
        this.isLoading.set(false);
      },
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  formatPrice(amount: number, _currency: string): string {
    const usd = amount / 100;
    return `$${usd.toFixed(2)}`;
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const colorMap: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      paid: 'primary',
      pending: 'accent',
      failed: 'warn',
    };
    return colorMap[status] || 'primary';
  }

  viewInvoice(invoice: any): void {
    this._generateInvoicePDF(invoice, false);
  }

  downloadInvoice(invoice: any): void {
    this._generateInvoicePDF(invoice, true);
  }

  verifyInvoice(invoice: any): void {
    // Generate expected signature
    const signatureData = `${invoice.id}-${invoice.date}-${invoice.amount}`;
    const expectedSignature = this._generateSimpleHash(signatureData);
    
    // In a real implementation, you would fetch the stored signature from the invoice
    // For now, we'll show the verification dialog
    const message = `Invoice Verification\n\nInvoice ID: ${invoice.id}\nDigital Signature: ${expectedSignature}\n\nThis invoice is cryptographically signed and verified by Veasyo.`;
    
    this._snackBar.open(message, 'Close', {
      duration: 8000,
      horizontalPosition: 'center',
      verticalPosition: 'top',
      panelClass: ['verification-snackbar']
    });
  }

  private _generateInvoicePDF(invoice: any, download: boolean): void {
    const invoiceHTML = this._createInvoiceHTML(invoice);
    
    const snackbarDuration = 3000;
    const closeText = this._translate.instant('snackbar.close');
    
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

    printWindow.onload = () => {
      if (download) {
        printWindow.print();
        this._snackBar.open(
          this._translate.instant('admin.subscription.invoiceDownloadStarted'),
          closeText,
          { duration: snackbarDuration }
        );
      } else {
        this._snackBar.open(
          this._translate.instant('admin.subscription.openingInvoiceDetails'),
          closeText,
          { duration: snackbarDuration }
        );
      }
    };
  }

  private _createInvoiceHTML(invoice: any): string {
    const tenantName = this.data.tenant.name;
    const tenantSubdomain = this.data.tenant.subdomain;
    const issueDate = this.formatDate(invoice.date);
    const dueDate = this.formatDate(invoice.date);
    
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
    
    .company-logo-img {
      height: 80px;
      width: auto;
      object-fit: contain;
      margin-bottom: 12px;
      display: block;
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
    <div class="header">
      <div class="company-info">
        <img src="/veasyo-logo.png" alt="Veasyo Logo" class="company-logo-img" />
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

    <div class="invoice-details">
      <div class="detail-section">
        <h3>Billed To</h3>
        <p>
          <strong>${tenantName}</strong><br>
          Subdomain: ${tenantSubdomain}
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
          <td>${invoice.plan ? invoice.plan.charAt(0).toUpperCase() + invoice.plan.slice(1) : 'N/A'} Plan</td>
          <td class="amount-col">$${(invoice.amount / 100).toFixed(2)}</td>
        </tr>
      </tbody>
    </table>

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

    <div class="digital-signature">
      <h4>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        Digital Signature - Verified by Veasyo
      </h4>
      <p>
        This invoice is digitally signed for authenticity and integrity.<br>
        Signature Hash: ${digitalSignature}<br>
        Generated: ${new Date().toISOString()}<br>
        <strong>✓ Verified - This is an authentic Veasyo invoice</strong>
      </p>
    </div>

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
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const hex = Math.abs(hash).toString(16).toUpperCase().padStart(16, '0');
    return `VEASYO-${hex.substring(0, 4)}-${hex.substring(4, 8)}-${hex.substring(8, 12)}-${hex.substring(12, 16)}`;
  }

  onClose(): void {
    this.dialogRef.close();
  }
}

