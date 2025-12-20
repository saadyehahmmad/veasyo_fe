import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
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
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { TenantThemeService } from '../../../services/tenant-theme.service';
import { Tenant } from '../../../models/types';
import { LoggerService } from '../../../services/logger.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

interface TenantBranding {
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  textColor?: string;
  languageColor?: string;
  backgroundPattern?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientDirection?: string;
  customCss?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  menuUrl?: string;
  customRequestEnabled?: boolean;
}

@Component({
  selector: 'app-tenant-branding',
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
    MatSelectModule,
    MatTooltipModule,
    TranslateModule,
  ],
  templateUrl: './tenant-branding.component.html',
  styleUrls: ['./tenant-branding.component.scss'],
})
export class TenantBrandingComponent implements OnInit {
  brandingForm: FormGroup;
  loading = signal(false);
  currentTenant = signal<Tenant | null>(null);
  previewColors = signal<TenantBranding>({
    primaryColor: '#667eea',
    secondaryColor: '#764ba2',
    accentColor: '#f093fb',
    textColor: '#333333',
    languageColor: '#333333',
  });

  private _logger = inject(LoggerService);
  private _translate = inject(TranslateService);

  constructor(
    private _fb: FormBuilder,
    private _apiService: ApiService,
    private _authService: AuthService,
    private _snackBar: MatSnackBar,
    private _themeService: TenantThemeService,
  ) {
    this.brandingForm = this._fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(100)]],
      logoUrl: [''],
      faviconUrl: [''],
      primaryColor: ['#667eea', Validators.required],
      secondaryColor: ['#764ba2', Validators.required],
      accentColor: ['#f093fb', Validators.required],
      textColor: ['#333333', Validators.required],
      languageColor: ['#333333'],
      backgroundPattern: [''],
      gradientStartColor: ['#667eea'],
      gradientEndColor: ['#764ba2'],
      gradientDirection: ['to right'],
      customCss: [''],
      facebookUrl: [''],
      instagramUrl: [''],
      twitterUrl: [''],
      linkedinUrl: [''],
      menuUrl: [''],
      customRequestEnabled: [true], // Default to enabled
    });
  }

  ngOnInit(): void {
    this.loadCurrentBranding();

    // Update preview when colors change
    this.brandingForm.valueChanges.subscribe((values) => {
      this.previewColors.set(values);
    });
  }

  loadCurrentBranding(): void {
    const user = this._authService.currentUser();
    if (!user?.tenantId) return;

    this.loading.set(true);

    // Load tenant information (for settings)
    this._apiService.getMyTenant().subscribe({
      next: (tenant: Tenant) => {
        this.currentTenant.set(tenant);
        this.brandingForm.patchValue({
          name: tenant.name || '',
          // Get customRequestEnabled from tenant settings
          customRequestEnabled: tenant.settings?.['customRequestEnabled'] !== undefined 
            ? tenant.settings['customRequestEnabled'] 
            : true, // Default to enabled if not set
        });
      },
      error: (err) => {
        this._logger.error('Error loading tenant:', err);
        this._snackBar.open(this._translate.instant('admin.tenantBranding.failedToLoadTenant'), 'Close', { duration: 3000 });
      },
    });

    // Load branding information
    this._apiService.getMyBranding().subscribe({
      next: (tenant: any) => {
        this.brandingForm.patchValue({
          logoUrl: tenant.logoUrl || '',
          faviconUrl: tenant.faviconUrl || '',
          primaryColor: tenant.primaryColor || '#667eea',
          secondaryColor: tenant.secondaryColor || '#764ba2',
          accentColor: tenant.accentColor || '#f093fb',
          textColor: tenant.textColor || '#333333',
          languageColor: tenant.languageColor || '#333333',
          backgroundPattern: tenant.backgroundPattern || '',
          gradientStartColor: tenant.gradientStartColor || '',
          gradientEndColor: tenant.gradientEndColor || '',
          gradientDirection: tenant.gradientDirection || 'to right',
          customCss: tenant.customCss || '',
          facebookUrl: tenant.facebookUrl || '',
          instagramUrl: tenant.instagramUrl || '',
          twitterUrl: tenant.twitterUrl || '',
          linkedinUrl: tenant.linkedinUrl || '',
          menuUrl: tenant.menuUrl || '',
        });
        this.loading.set(false);
      },
      error: (err) => {
        this._logger.error('Error loading branding:', err);
        this._snackBar.open(this._translate.instant('admin.tenantBranding.failedToLoadBranding'), 'Close', { duration: 3000 });
        this.loading.set(false);
      },
    });
  }
  saveBranding(): void {
    if (this.brandingForm.invalid) return;

    const user = this._authService.currentUser();
    if (!user?.tenantId) {
      this._snackBar.open(this._translate.instant('admin.tenantBranding.userOrTenantNotFound'), 'Close', { duration: 3000 });
      return;
    }

    this.loading.set(true);
    const brandingData = this.brandingForm.value;

    // Extract customRequestEnabled to settings
    const customRequestEnabled = brandingData.customRequestEnabled;
    delete brandingData.customRequestEnabled;

    // Clean up empty values (but keep menuUrl and backgroundPattern even if empty to allow clearing/setting to none)
    Object.keys(brandingData).forEach((key) => {
      if (key === 'menuUrl') {
        // For menuUrl, send null if empty to allow clearing it
        if (brandingData[key] === '' || brandingData[key] === null) {
          brandingData[key] = null;
        }
      } else if (key === 'backgroundPattern') {
        // For backgroundPattern, keep empty string to allow setting to "none"
        // Do nothing, keep as is
      } else if (brandingData[key] === '' || brandingData[key] === null) {
        delete brandingData[key];
      }
    });

    // Add settings with customRequestEnabled
    if (customRequestEnabled !== undefined) {
      brandingData.settings = {
        customRequestEnabled: customRequestEnabled,
      };
    }

    this._apiService.updateMyBranding(brandingData).subscribe({
      next: async () => {
        this._snackBar.open(this._translate.instant('admin.tenantBranding.saveSuccess'), 'Close', {
          duration: 3000,
        });
        this.loading.set(false);

        // Reload theme immediately without full page refresh
        const subdomain = this._themeService.getSubdomainFromHostname();
        if (subdomain) {
          await this._themeService.loadTenantBranding(subdomain);
          this._snackBar.open(this._translate.instant('admin.tenantBranding.themeApplied'), 'Close', {
            duration: 3000,
          });
        } else {
          // Fallback to full page reload if no subdomain
          setTimeout(() => window.location.reload(), 1500);
        }
      },
      error: (err) => {
        this._logger.error('Error updating branding:', err);
        const errorMsg = err.error?.message || this._translate.instant('admin.tenantBranding.saveFailed');
        this._snackBar.open(`❌ ${errorMsg}`, 'Close', { duration: 5000 });
        this.loading.set(false);
      },
    });
  }

  resetToDefaults(): void {
    this.brandingForm.patchValue({
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#f093fb',
      textColor: '#333333',
      languageColor: '#333333',
      backgroundPattern: '',
      gradientStartColor: '#667eea',
      gradientEndColor: '#764ba2',
      gradientDirection: 'to right',
    });
  }

  handleFileUpload(event: Event, field: 'logoUrl' | 'faviconUrl'): void {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validate file type
    if (!file.type.startsWith('image/')) {
      this._snackBar.open(this._translate.instant('admin.tenantBranding.pleaseSelectImage'), 'Close', { duration: 3000 });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      this._snackBar.open(this._translate.instant('admin.tenantBranding.fileSizeTooLarge'), 'Close', { duration: 3000 });
      return;
    }

    // TODO: Implement actual file upload to storage service (S3, Cloudinary, etc.)
    // For now, create a local preview URL
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      this.brandingForm.patchValue({ [field]: dataUrl });
      this._snackBar.open(
        this._translate.instant('admin.tenantBranding.uploadNotImplemented'),
        'Close',
        { duration: 5000 },
      );
    };
    reader.readAsDataURL(file);
  }

  /**
   * Apply current branding immediately for preview
   */
  previewBrandingLive(): void {
    const branding = this.brandingForm.value;
    this._themeService['_applyTheme'](branding);
    this._snackBar.open(this._translate.instant('admin.tenantBranding.previewApplied'), 'Close', { duration: 2000 });
  }

  /**
   * Test branding by applying it temporarily
   */
  testBranding(): void {
    if (this.brandingForm.invalid) {
      this._snackBar.open(this._translate.instant('admin.tenantBranding.fillRequiredFields'), 'Close', { duration: 3000 });
      return;
    }
    this.previewBrandingLive();
  }
}
