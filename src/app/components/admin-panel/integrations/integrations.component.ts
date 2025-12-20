import { Component, OnInit, inject, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-integrations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatSlideToggleModule,
    MatTooltipModule,
    MatSelectModule,
    TranslateModule,
  ],
  templateUrl: './integrations.component.html',
  styleUrls: ['./integrations.component.scss'],
})
export class IntegrationsComponent implements OnInit, AfterViewInit {
  @ViewChild('receiptCanvas', { static: false }) receiptCanvas!: ElementRef<HTMLCanvasElement>;
  
  loading = signal(false);
  saving = signal(false);
  
  // Integration forms
  printerForm: FormGroup;
  alarmForm: FormGroup;
  webhookForm: FormGroup;

  private _fb = inject(FormBuilder);
  private _apiService = inject(ApiService);
  private _authService = inject(AuthService);
  private _snackBar = inject(MatSnackBar);
  private _logger = inject(LoggerService);
  private _translate = inject(TranslateService);

  constructor() {
    // Printer integration form
    // PC Agent is the ONLY method for printer communication (Local Network Bridge)
    // Architecture: Backend -> Socket.IO -> PC Agent -> TCP -> Printer
    // PC Agent connects to backend automatically - no IP/Port configuration needed
    // Printer is configured in PC Agent's .env file (PRINTER_IP, PRINTER_PORT)
    this.printerForm = this._fb.group({
      enabled: [false],
      // Common fields
      printerName: [''],
      paperWidth: [80], // mm (58 or 80 for thermal)
      autoPrint: [true],
      printHeader: [true], // Print restaurant name/logo
      printFooter: [true], // Print timestamp/footer
      language: ['both'], // Language: 'en', 'ar', or 'both'
    });

    // Alarm integration form (network speaker)
    // Note: Validators are conditional - only required when enabled
    this.alarmForm = this._fb.group({
      enabled: [false],
      speakerIp: [''],
      speakerPort: [8080, [Validators.min(1), Validators.max(65535)]],
      volume: [80, [Validators.min(0), Validators.max(100)]], // 0-100
      duration: [5, [Validators.min(1), Validators.max(60)]], // seconds
      soundType: ['beep'], // beep, alert, custom
      customSoundUrl: [''], // URL for custom sound
    });

    // Update validators when enabled state changes
    this.alarmForm.get('enabled')?.valueChanges.subscribe((enabled) => {
      const ipControl = this.alarmForm.get('speakerIp');
      const portControl = this.alarmForm.get('speakerPort');
      
      if (enabled) {
        ipControl?.setValidators([Validators.required]);
        portControl?.setValidators([Validators.required, Validators.min(1), Validators.max(65535)]);
      } else {
        ipControl?.clearValidators();
        portControl?.setValidators([Validators.min(1), Validators.max(65535)]);
      }
      
      ipControl?.updateValueAndValidity();
      portControl?.updateValueAndValidity();
    });

    // Webhook integration form for notifications
    // Note: Validators are conditional - only required when enabled
    this.webhookForm = this._fb.group({
      enabled: [false],
      webhookUrl: ['', [Validators.pattern(/^https?:\/\/.+$/)]],
      secretKey: [''],
      events: this._fb.group({
        newRequest: [true],
        requestAcknowledged: [true],
        requestCompleted: [true],
        requestCancelled: [false],
      }),
      retryAttempts: [3],
      timeout: [5000], // milliseconds
    });

    // Update validators when enabled state changes
    this.webhookForm.get('enabled')?.valueChanges.subscribe((enabled) => {
      const urlControl = this.webhookForm.get('webhookUrl');
      
      if (enabled) {
        urlControl?.setValidators([Validators.required, Validators.pattern(/^https?:\/\/.+$/)]);
      } else {
        urlControl?.setValidators([Validators.pattern(/^https?:\/\/.+$/)]);
      }
      
      urlControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.loadIntegrations();
  }

  ngAfterViewInit(): void {
    // Draw initial receipt preview and update on form changes
    setTimeout(() => {
      this.drawReceiptPreview();
      
      // Update receipt preview when printer form changes
      this.printerForm.valueChanges.subscribe(() => {
        setTimeout(() => {
          this.drawReceiptPreview();
        }, 50);
      });
    }, 200);
  }

  loadIntegrations(): void {
    this.loading.set(true);
    
    // Load all integrations in parallel
    this._apiService.getPrinterIntegration().subscribe({
      next: (printer) => {
        if (printer) {
          this.printerForm.patchValue({
            enabled: printer.enabled || false,
            printerName: printer.printerName || '',
            paperWidth: printer.paperWidth || 80,
            autoPrint: printer.autoPrint !== undefined ? printer.autoPrint : true,
            printHeader: printer.printHeader !== undefined ? printer.printHeader : true,
            printFooter: printer.printFooter !== undefined ? printer.printFooter : true,
            language: printer.language || 'both',
          });
        }
      },
      error: (error) => {
        this._logger.error('Error loading printer integration:', error);
      },
    });

    this._apiService.getSpeakerIntegration().subscribe({
      next: (speaker) => {
        if (speaker) {
          this.alarmForm.patchValue({
            enabled: speaker.enabled || false,
            speakerIp: speaker.speakerIp || '',
            speakerPort: speaker.speakerPort || 8080,
            volume: speaker.volume || 80,
            duration: speaker.duration || 5,
            soundType: speaker.soundType || 'beep',
            customSoundUrl: speaker.customSoundUrl || '',
          });
        }
      },
      error: (error) => {
        this._logger.error('Error loading speaker integration:', error);
      },
    });

    this._apiService.getWebhookIntegration().subscribe({
      next: (webhook) => {
        if (webhook) {
          this.webhookForm.patchValue({
            enabled: webhook.enabled || false,
            webhookUrl: webhook.webhookUrl || '',
            secretKey: webhook.secretKey || '',
            events: {
              newRequest: webhook.events?.newRequest !== undefined ? webhook.events.newRequest : true,
              requestAcknowledged: webhook.events?.requestAcknowledged !== undefined ? webhook.events.requestAcknowledged : true,
              requestCompleted: webhook.events?.requestCompleted !== undefined ? webhook.events.requestCompleted : true,
              requestCancelled: webhook.events?.requestCancelled !== undefined ? webhook.events.requestCancelled : false,
            },
            retryAttempts: webhook.retryAttempts || 3,
            timeout: webhook.timeout || 5000,
          });
        }
        this.loading.set(false);
      },
      error: (error) => {
        this._logger.error('Error loading webhook integration:', error);
        this.loading.set(false);
      },
    });
  }

  savePrinterIntegration(): void {
    if (this.printerForm.invalid) return;
    this.saving.set(true);
    
    const data = this.printerForm.value;
    this._logger.debug('Saving printer integration:', data);
    
    this._apiService.updatePrinterIntegration(data).subscribe({
      next: (response) => {
        this._snackBar.open(
          this._translate.instant('admin.integrations.printer.saveSuccess'),
          'Close',
          { duration: 3000 }
        );
        this.saving.set(false);
        this._logger.debug('Printer integration saved:', response);
      },
      error: (error) => {
        this._logger.error('Error saving printer integration:', error);
        this._snackBar.open(
          error.error?.message || this._translate.instant('admin.integrations.printer.saveFailed') || 'Failed to save printer settings',
          'Close',
          { duration: 5000 }
        );
        this.saving.set(false);
      },
    });
  }

  saveAlarmIntegration(): void {
    if (this.alarmForm.invalid) return;
    this.saving.set(true);
    
    const data = this.alarmForm.value;
    this._logger.debug('Saving speaker integration:', data);
    
    this._apiService.updateSpeakerIntegration(data).subscribe({
      next: (response) => {
        this._snackBar.open(
          this._translate.instant('admin.integrations.alarm.saveSuccess'),
          'Close',
          { duration: 3000 }
        );
        this.saving.set(false);
        this._logger.debug('Speaker integration saved:', response);
      },
      error: (error) => {
        this._logger.error('Error saving speaker integration:', error);
        this._snackBar.open(
          error.error?.message || this._translate.instant('admin.integrations.alarm.saveFailed') || 'Failed to save speaker settings',
          'Close',
          { duration: 5000 }
        );
        this.saving.set(false);
      },
    });
  }

  saveWebhookIntegration(): void {
    if (this.webhookForm.invalid) return;
    this.saving.set(true);
    
    const data = this.webhookForm.value;
    this._logger.debug('Saving webhook integration:', data);
    
    this._apiService.updateWebhookIntegration(data).subscribe({
      next: (response) => {
        this._snackBar.open(
          this._translate.instant('admin.integrations.webhook.saveSuccess'),
          'Close',
          { duration: 3000 }
        );
        this.saving.set(false);
        this._logger.debug('Webhook integration saved:', response);
      },
      error: (error) => {
        this._logger.error('Error saving webhook integration:', error);
        this._snackBar.open(
          error.error?.message || this._translate.instant('admin.integrations.webhook.saveFailed') || 'Failed to save webhook settings',
          'Close',
          { duration: 5000 }
        );
        this.saving.set(false);
      },
    });
  }

  testWebhook(): void {
    if (this.webhookForm.get('webhookUrl')?.value) {
      this._snackBar.open(
        this._translate.instant('admin.integrations.webhook.testMessage'),
        'Close',
        { duration: 3000 }
      );
    } else {
      this._snackBar.open(
        this._translate.instant('admin.integrations.webhook.urlRequired'),
        'Close',
        { duration: 3000 }
      );
    }
  }

  testPrinter(): void {
    if (!this.printerForm.get('enabled')?.value) {
      this._snackBar.open(
        this._translate.instant('admin.integrations.printer.notEnabled') || 'Please enable printer integration first',
        'Close',
        { duration: 3000 }
      );
      return;
    }

    this._apiService.testPrinterIntegration().subscribe({
      next: () => {
        this._snackBar.open(
          this._translate.instant('admin.integrations.printer.testSuccess') || 'Test print sent successfully',
          'Close',
          { duration: 3000 }
        );
      },
      error: (error) => {
        this._logger.error('Error testing printer:', error);
        this._snackBar.open(
          error.error?.message || this._translate.instant('admin.integrations.printer.testFailed') || 'Failed to send test print',
          'Close',
          { duration: 5000 }
        );
      },
    });
  }


  testAlarm(): void {
    if (!this.alarmForm.get('enabled')?.value) {
      this._snackBar.open(
        this._translate.instant('admin.integrations.alarm.notEnabled') || 'Please enable speaker integration first',
        'Close',
        { duration: 3000 }
      );
      return;
    }

    this._apiService.testSpeakerIntegration().subscribe({
      next: () => {
        this._snackBar.open(
          this._translate.instant('admin.integrations.alarm.testSuccess') || 'Test alert triggered successfully',
          'Close',
          { duration: 3000 }
        );
      },
      error: (error) => {
        this._logger.error('Error testing speaker:', error);
        this._snackBar.open(
          error.error?.message || this._translate.instant('admin.integrations.alarm.testFailed') || 'Failed to trigger test alert',
          'Close',
          { duration: 5000 }
        );
      },
    });
  }

  // Getter for events form group
  get eventsFormGroup(): FormGroup {
    return this.webhookForm.get('events') as FormGroup;
  }

  // Helper method to ensure Arabic/Persian text is properly formatted
  // Note: We don't reverse Arabic text - it should be displayed naturally
  // The canvas direction property handles RTL automatically
  private formatArabicText(text: string): string {
    // Return text as-is - Arabic/Persian text is already in the correct order
    // The browser/canvas will handle RTL rendering automatically when direction is set to 'rtl'
    return text;
  }

  // Helper method to render receipt header in a specific language
  private renderReceiptHeader(
    ctx: CanvasRenderingContext2D,
    width: number,
    startY: number,
    margin: number,
    lineHeight: number,
    scale: number,
    lang: 'en' | 'ar'
  ): number {
    let y = startY;
    
    // Center align for header
    ctx.textAlign = 'center';
    
    // Use fonts that support Arabic - try Tahoma, then Arial Unicode MS, then Arial
    const arabicFont = 'Tahoma, "Arial Unicode MS", Arial, sans-serif';
    
    // Set text direction for Arabic/Persian
    if (lang === 'ar') {
      ctx.direction = 'rtl';
    } else {
      ctx.direction = 'ltr';
    }
    
    // Restaurant name
    ctx.font = `bold ${16 * scale}px ${lang === 'ar' ? arabicFont : 'Arial'}`;
    const restaurantName = lang === 'ar' ? this.formatArabicText('اسم المطعم') : 'RESTAURANT NAME';
    ctx.fillText(restaurantName, width / 2, y);
    y += lineHeight * 1.5;
    
    // Address
    ctx.font = `${12 * scale}px ${lang === 'ar' ? arabicFont : 'Arial'}`;
    const address = lang === 'ar' ? this.formatArabicText('123 الشارع الرئيسي') : '123 Main Street';
    ctx.fillText(address, width / 2, y);
    y += lineHeight;
    
    // Phone
    const phoneLabel = lang === 'ar' ? this.formatArabicText('الهاتف: ') : 'Phone: ';
    ctx.fillText(lang === 'ar' ? `${phoneLabel}+1234567890` : `${phoneLabel}+1234567890`, width / 2, y);
    y += lineHeight * 1.5;
    
    // Separator line
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    y += lineHeight;
    
    return y;
  }

  // Helper method to render receipt content in a specific language
  private renderReceiptContent(
    ctx: CanvasRenderingContext2D,
    width: number,
    startY: number,
    margin: number,
    lineHeight: number,
    scale: number,
    timeStr: string,
    now: Date,
    lang: 'en' | 'ar'
  ): number {
    let y = startY;
    
    // Use fonts that support Arabic/Persian properly
    // These fonts have good support for Arabic and Persian characters
    const arabicFont = '"Arial Unicode MS", "Tahoma", "DejaVu Sans", "Segoe UI", Arial, sans-serif';
    const fontFamily = lang === 'ar' ? arabicFont : 'Arial';
    
    // Set text direction based on language
    // RTL direction is essential for proper Arabic/Persian text rendering
    ctx.direction = lang === 'ar' ? 'rtl' : 'ltr';
    
    // Order header
    ctx.textAlign = 'center';
    ctx.font = `bold ${14 * scale}px ${fontFamily}`;
    const orderHeader = lang === 'ar' ? this.formatArabicText('طلب جديد') : 'NEW ORDER';
    ctx.fillText(orderHeader, width / 2, y);
    y += lineHeight * 1.5;
    
    // Language indicator
    ctx.font = `${10 * scale}px ${fontFamily}`;
    ctx.fillStyle = '#666666';
    const langLabel = lang === 'ar' ? this.formatArabicText('(عربي)') : '(English)';
    ctx.fillText(langLabel, width / 2, y);
    ctx.fillStyle = '#000000';
    y += lineHeight * 1.5;
    
    // Table info
    ctx.font = `${12 * scale}px ${fontFamily}`;
    // For Arabic, use right alignment; for English, use left alignment
    if (lang === 'ar') {
      ctx.textAlign = 'right';
      const tableLabel = this.formatArabicText(`الطاولة: T-05`);
      const timeLabel = this.formatArabicText(`الوقت: ${timeStr}`);
      ctx.fillText(tableLabel, width - margin, y);
      ctx.textAlign = 'left';
      ctx.fillText(timeLabel, margin, y);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(`Table: T-05`, margin, y);
      ctx.textAlign = 'right';
      ctx.fillText(`Time: ${timeStr}`, width - margin, y);
    }
    y += lineHeight * 1.5;
    
    // Separator
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    y += lineHeight;
    
    // Request type
    ctx.textAlign = lang === 'ar' ? 'right' : 'left';
    ctx.font = `bold ${13 * scale}px ${fontFamily}`;
    const requestTypeLabel = lang === 'ar' ? this.formatArabicText('نوع الطلب:') : 'Request Type:';
    ctx.fillText(requestTypeLabel, lang === 'ar' ? width - margin : margin, y);
    y += lineHeight;
    
    ctx.font = `${12 * scale}px ${fontFamily}`;
    const requestItem = lang === 'ar' ? this.formatArabicText('• طلب النادل') : '• Call Waiter';
    ctx.fillText(requestItem, lang === 'ar' ? width - margin - 10 * scale : margin + 10 * scale, y);
    y += lineHeight;
    
    // Custom note
    ctx.font = `${11 * scale}px ${fontFamily}`;
    const noteText = lang === 'ar' ? this.formatArabicText('ملاحظة: مناديل إضافية من فضلك') : 'Note: Extra napkins please';
    ctx.fillText(noteText, lang === 'ar' ? width - margin - 10 * scale : margin + 10 * scale, y);
    y += lineHeight * 1.5;
    
    // Separator
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.moveTo(margin, y);
    ctx.lineTo(width - margin, y);
    ctx.stroke();
    y += lineHeight;
    
    // Footer (if printFooter is enabled)
    if (this.printerForm.get('printFooter')?.value) {
      ctx.textAlign = 'center';
      ctx.font = `${10 * scale}px ${fontFamily}`;
      const thankYou = lang === 'ar' ? this.formatArabicText('شكراً لك!') : 'Thank you!';
      ctx.fillText(thankYou, width / 2, y);
      y += lineHeight;
      ctx.font = `${9 * scale}px ${fontFamily}`;
      // Use Arabic locale for timestamp if Arabic is selected
      const timestampStr = lang === 'ar' ? now.toLocaleString('ar-SA') : now.toLocaleString();
      ctx.fillText(timestampStr, width / 2, y);
      y += lineHeight;
    }
    
    return y;
  }

  // Draw receipt preview on canvas
  drawReceiptPreview(): void {
    // Only draw if printer is enabled and canvas is available
    if (!this.receiptCanvas || !this.printerForm.get('enabled')?.value) {
      return;
    }
    
    const canvas = this.receiptCanvas.nativeElement;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const paperWidth = this.printerForm.get('paperWidth')?.value || 80;
    const language = this.printerForm.get('language')?.value || 'both';
    const scale = 2; // For better quality
    const mmToPx = 3.779527559; // 1mm = 3.78px at 96dpi
    const width = paperWidth * mmToPx * scale;
    const height = (language === 'both' ? 600 : 400) * scale; // Taller for both languages
    
    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;
    canvas.style.width = `${width / scale}px`;
    canvas.style.height = `${height / scale}px`;
    
    // Clear canvas with white background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    
    // Set text styles
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    
    let y = 20 * scale;
    const lineHeight = 20 * scale;
    const margin = 10 * scale;
    
    // Render receipt(s) based on language selection
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    if (language === 'both') {
      // Render English version with header
      if (this.printerForm.get('printHeader')?.value) {
        y = this.renderReceiptHeader(ctx, width, y, margin, lineHeight, scale, 'en');
      }
      y = this.renderReceiptContent(ctx, width, y, margin, lineHeight, scale, timeStr, now, 'en');
      
      // Add separator between receipts
      y += lineHeight * 2;
      ctx.strokeStyle = '#cccccc';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([5 * scale, 5 * scale]);
      ctx.beginPath();
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
      ctx.setLineDash([]);
      y += lineHeight * 2;
      
      // Render Arabic version with header
      if (this.printerForm.get('printHeader')?.value) {
        y = this.renderReceiptHeader(ctx, width, y, margin, lineHeight, scale, 'ar');
      }
      y = this.renderReceiptContent(ctx, width, y, margin, lineHeight, scale, timeStr, now, 'ar');
    } else {
      // Render single language version with header
      if (this.printerForm.get('printHeader')?.value) {
        y = this.renderReceiptHeader(ctx, width, y, margin, lineHeight, scale, language);
      }
      y = this.renderReceiptContent(ctx, width, y, margin, lineHeight, scale, timeStr, now, language);
    }
  }
}

