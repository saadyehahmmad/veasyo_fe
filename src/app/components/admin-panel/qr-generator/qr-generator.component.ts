import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { TranslateModule } from '@ngx-translate/core';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { SnackbarService } from '../../../services/snackbar.service';
import { LoggerService } from '../../../services/logger.service';
import { TableQRCode } from '../../../models/types';

interface TableQRData {
  table: {
    id: string;
    tableNumber: string;
    name?: string;
    zone?: string;
    capacity?: number;
    status: string;
  };
  qrData: string;
  qrImage: string;
}

@Component({
  selector: 'app-qr-generator',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './qr-generator.component.html',
  styleUrls: ['./qr-generator.component.scss'],
})
export class QrGeneratorComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _authService = inject(AuthService);
  private _snackbar = inject(SnackbarService);
  private _logger = inject(LoggerService);

  qrCodes = signal<TableQRCode[]>([]);
  loading = signal<boolean>(false);
  brandedStickers = signal<Map<string, string>>(new Map());
  loadingStickers = signal<boolean>(false);
  viewMode = signal<'classic' | 'branded'>('classic');

  // Compute QR data for each table
  tableQRData = computed<TableQRData[]>(() => {
    return this.qrCodes().map((qrCode) => ({
      table: {
        id: qrCode.tableId,
        tableNumber: qrCode.tableNumber,
        name: qrCode.name,
        zone: qrCode.zone,
        capacity: qrCode.capacity,
        status: qrCode.status,
      },
      qrData: qrCode.qrUrl,
      qrImage: qrCode.qrImage,
    }));
  });

  ngOnInit(): void {
    this._loadQRCodes();
  }

  downloadQR(tableQR: TableQRData, format: 'png' | 'svg' = 'png'): void {
    try {
      // Use backend download endpoints
      if (this.isBrandedMode()) {
        // Download branded sticker from backend
        this._apiService.downloadTableSticker(tableQR.table.id).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `table-${tableQR.table.name || tableQR.table.tableNumber}-branded-sticker.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            this._snackbar.success('Branded sticker downloaded!');
          },
          error: (error) => {
            this._logger.error('Failed to download branded sticker:', error);
            this._snackbar.error('Failed to download branded sticker');
          },
        });
      } else {
        // Download classic QR code from backend
        this._apiService.downloadTableQRCode(tableQR.table.id, format).subscribe({
          next: (blob) => {
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `table-${tableQR.table.name || tableQR.table.tableNumber}-qr.${format}`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            this._snackbar.success(`QR code downloaded as ${format.toUpperCase()}!`);
          },
          error: (error) => {
            this._logger.error('Failed to download QR code:', error);
            this._snackbar.error('Failed to download QR code');
          },
        });
      }
    } catch (error) {
      this._logger.error('Failed to download QR code:', error);
      this._snackbar.error('Failed to download QR code');
    }
  }

  downloadAllQRs(): void {
    this.loading.set(true);
    const currentUser = this._authService.currentUser();
    const tenantName = currentUser?.tenantSubdomain || 'tenant';

    if (this.isClassicMode()) {
      // Download classic QR codes ZIP from backend
      this._snackbar.info('Generating classic QR codes...');
      
      this._apiService.downloadClassicQRCodesZip().subscribe({
        next: (blob) => {
          const filename = `qr-classic-${tenantName}-${new Date().getTime()}.zip`;
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          this.loading.set(false);
          this._snackbar.success('Classic QR codes downloaded successfully!');
          this._logger.info('Downloaded classic QR codes ZIP:', filename);
        },
        error: (error) => {
          this.loading.set(false);
          this._logger.error('Failed to download classic QR codes:', error);
          this._snackbar.error('Failed to download classic QR codes');
        },
      });
    } else {
      // Download branded stickers ZIP from backend
      this._snackbar.info('Generating styled QR stickers...');
      
      this._apiService.downloadQRStickersZip().subscribe({
        next: (blob) => {
          const filename = `qr-stickers-${tenantName}-${new Date().getTime()}.zip`;
          
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          
          this.loading.set(false);
          this._snackbar.success('QR stickers downloaded successfully!');
          this._logger.info('Downloaded QR stickers ZIP:', filename);
        },
        error: (error) => {
          this.loading.set(false);
          this._logger.error('Failed to download QR stickers:', error);
          this._snackbar.error('Failed to download QR stickers');
        },
      });
    }
  }

  printQR(tableQR: TableQRData): void {
    // Open backend print HTML page
    const mode = this.isBrandedMode() ? 'branded' : 'classic';
    const apiUrl = this._apiService.getApiUrl();
    const printUrl = `${apiUrl}/api/tables/qr-codes/${tableQR.table.id}/print?mode=${mode}`;
    
    // Open in new window - backend will handle authentication via cookie
    const printWindow = window.open(printUrl, '_blank');
    if (!printWindow) {
      this._snackbar.error('Failed to open print window. Please check your popup blocker settings.');
    }
  }

  refreshTables(): void {
    this._loadQRCodes();
  }

  loadBrandedStickers(): void {
    this.loadingStickers.set(true);
    this._snackbar.info('Generating branded stickers preview...');
    
    this._apiService.getTableQRStickers().subscribe({
      next: (stickers) => {
        const stickerMap = new Map<string, string>();
        stickers.forEach((sticker) => {
          stickerMap.set(sticker.tableId, sticker.stickerImage);
        });
        this.brandedStickers.set(stickerMap);
        this.loadingStickers.set(false);
        this._snackbar.success('Branded stickers loaded!');
      },
      error: (error) => {
        this._logger.error('Failed to load branded stickers:', error);
        this._snackbar.error('Failed to load branded stickers');
        this.loadingStickers.set(false);
      },
    });
  }

  getBrandedSticker(tableId: string): string | undefined {
    return this.brandedStickers().get(tableId);
  }

  hasBrandedStickers(): boolean {
    return this.brandedStickers().size > 0;
  }

  toggleViewMode(): void {
    const currentMode = this.viewMode();
    if (currentMode === 'classic') {
      // Switch to branded - load stickers if not loaded
      if (!this.hasBrandedStickers()) {
        this.loadBrandedStickers();
      }
      this.viewMode.set('branded');
    } else {
      this.viewMode.set('classic');
    }
  }

  isClassicMode(): boolean {
    return this.viewMode() === 'classic';
  }

  isBrandedMode(): boolean {
    return this.viewMode() === 'branded';
  }

  private _loadQRCodes(): void {
    this.loading.set(true);
    this._snackbar.info('Loading QR codes from backend...');
    
    this._apiService.getTableQRCodes().subscribe({
      next: (qrCodes) => {
        this._logger.info('Loaded QR codes from backend:', qrCodes);
        this.qrCodes.set(qrCodes);
        this.loading.set(false);
        this._snackbar.success(`Loaded ${qrCodes.length} QR codes from backend`);
      },
      error: (error) => {
        this._logger.error('Failed to load QR codes from backend:', error);
        this._snackbar.error('Failed to load QR codes from backend');
        this.loading.set(false);
      },
    });
  }

  copyQRUrl(qrUrl: string): void {
    navigator.clipboard.writeText(qrUrl).then(
      () => {
        this._snackbar.success('QR URL copied to clipboard');
      },
      () => {
        this._snackbar.error('Failed to copy URL');
      }
    );
  }

  getQRUrl(tableQR: TableQRData): string {
    return tableQR.qrData;
  }
}
