import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { TranslateModule } from '@ngx-translate/core';
import { TenantThemeService } from '../../../services/tenant-theme.service';
import { LoggerService } from '../../../services/logger.service';

@Component({
  selector: 'app-customer-footer',
  standalone: true,
  imports: [CommonModule, MatIconModule, TranslateModule],
  templateUrl: './customer-footer.component.html',
  styleUrls: ['./customer-footer.component.scss'],
})
export class CustomerFooterComponent {
  private _themeService = inject(TenantThemeService);
  private _logger = inject(LoggerService);

  currentYear = new Date().getFullYear();

  // Direct access to the branding signal from theme service
  branding = this._themeService.getBranding();

  // Mock social media links for testing
  mockBranding = {
    facebookUrl: 'https://facebook.com',
    instagramUrl: 'https://instagram.com',
    twitterUrl: 'https://twitter.com',
    linkedinUrl: 'https://linkedin.com',
  };

  hasSocialLinks = computed(() => {
    const b = this.branding();
    this._logger.debug('Footer branding:', b);
    this._logger.debug(
      'Has social links:',
      !!(b?.facebookUrl || b?.instagramUrl || b?.twitterUrl || b?.linkedinUrl),
    );
    // Use mock data if no branding loaded
    return !!(
      b?.facebookUrl ||
      b?.instagramUrl ||
      b?.twitterUrl ||
      b?.linkedinUrl ||
      this.mockBranding
    );
  });

  // Helper method to get social URL with fallback to mock
  getSocialUrl(platform: 'facebookUrl' | 'instagramUrl' | 'twitterUrl' | 'linkedinUrl'): string {
    return this.branding()?.[platform] || this.mockBranding[platform];
  }
}
