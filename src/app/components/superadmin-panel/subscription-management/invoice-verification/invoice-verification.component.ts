import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { SuperAdminService } from '../../../../services/superadmin.service';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

interface VerifiedInvoice {
  id: string;
  date: string;
  amount: number;
  currency: string;
  status: string;
  plan: string;
  period: string;
  description?: string;
  tenantId: string;
  tenantName: string;
  signature: string;
  isValid: boolean;
}

@Component({
  selector: 'app-invoice-verification',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    TranslateModule,
  ],
  templateUrl: './invoice-verification.component.html',
  styleUrls: ['./invoice-verification.component.scss'],
})
export class InvoiceVerificationComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _superAdminService = inject(SuperAdminService);
  private _snackBar = inject(MatSnackBar);
  private _translate = inject(TranslateService);

  verificationForm: FormGroup;
  isVerifying = signal(false);
  verifiedInvoice = signal<VerifiedInvoice | null>(null);
  isFake = signal(false);
  errorMessage = signal<string | null>(null);

  constructor() {
    this.verificationForm = this._fb.group({
      signature: ['', [Validators.required, Validators.pattern(/^VEASYO-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/i)]],
    });
  }

  ngOnInit(): void {
    // Auto-focus on signature input
  }

  verifySignature(): void {
    if (this.verificationForm.invalid) {
      this._snackBar.open(
        this._translate.instant('admin.superadmin.invoiceVerification.invalidFormat'),
        this._translate.instant('snackbar.close'),
        { duration: 3000 }
      );
      return;
    }

    const signature = this.verificationForm.get('signature')?.value?.trim().toUpperCase();
    if (!signature) {
      return;
    }

    this.isVerifying.set(true);
    this.verifiedInvoice.set(null);
    this.isFake.set(false);
    this.errorMessage.set(null);

    // Get all tenants and their invoices
    this._superAdminService.getAllTenantsUsage().subscribe({
      next: (tenantsResponse) => {
        const tenants = tenantsResponse.tenants || [];
        
        // Get invoices for all tenants
        const invoiceRequests = tenants.map((tenant: any) =>
          this._superAdminService.getTenantInvoices(tenant.tenant.id).pipe(
            map((response: any) => ({
              tenant: tenant.tenant,
              invoices: response.invoices || [],
            })),
            catchError(() => of({ tenant: tenant.tenant, invoices: [] }))
          )
        );

        if (invoiceRequests.length === 0) {
          this.isFake.set(true);
          this.isVerifying.set(false);
          return;
        }

        forkJoin(invoiceRequests).subscribe({
          next: (results) => {
            let foundInvoice: any = null;
            let foundTenant: any = null;

            // Search through all invoices
            for (const result of results) {
              for (const invoice of result.invoices) {
                // Generate expected signature
                const signatureData = `${invoice.id}-${invoice.date}-${invoice.amount}`;
                const expectedSignature = this._generateSimpleHash(signatureData);

                if (expectedSignature === signature) {
                  foundInvoice = invoice;
                  foundTenant = result.tenant;
                  break;
                }
              }
              if (foundInvoice) break;
            }

            if (foundInvoice && foundTenant) {
              // Invoice is valid
              this.verifiedInvoice.set({
                id: foundInvoice.id,
                date: foundInvoice.date,
                amount: foundInvoice.amount,
                currency: foundInvoice.currency || 'USD',
                status: foundInvoice.status,
                plan: foundInvoice.plan || 'N/A',
                period: foundInvoice.period || 'N/A',
                description: foundInvoice.description,
                tenantId: foundTenant.id,
                tenantName: foundTenant.name,
                signature: signature,
                isValid: true,
              });
              this.isFake.set(false);
            } else {
              // Invoice not found - it's fake
              this.isFake.set(true);
              this.verifiedInvoice.set(null);
            }

            this.isVerifying.set(false);
          },
          error: (error) => {
            console.error('Error verifying invoice:', error);
            this.errorMessage.set('Failed to verify invoice. Please try again.');
            this.isVerifying.set(false);
          },
        });
      },
      error: (error) => {
        console.error('Error loading tenants:', error);
        this.errorMessage.set('Failed to load tenant data. Please try again.');
        this.isVerifying.set(false);
      },
    });
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  formatPrice(amount: number, currency: string): string {
    const usd = amount / 100;
    return `$${usd.toFixed(2)} ${currency}`;
  }

  getStatusColor(status: string): 'primary' | 'accent' | 'warn' {
    const colorMap: { [key: string]: 'primary' | 'accent' | 'warn' } = {
      paid: 'primary',
      pending: 'accent',
      failed: 'warn',
    };
    return colorMap[status] || 'primary';
  }

  clearVerification(): void {
    this.verificationForm.reset();
    this.verifiedInvoice.set(null);
    this.isFake.set(false);
    this.errorMessage.set(null);
  }
}

