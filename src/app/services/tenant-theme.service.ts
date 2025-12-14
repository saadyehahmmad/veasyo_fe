import { Injectable, signal, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { LoggerService } from './logger.service';

export interface TenantBranding {
  name?: string;
  logoUrl?: string;
  faviconUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  customCss?: string;
  theme?: any;
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TenantThemeService {
  private _currentBranding = signal<TenantBranding | null>(null);
  private _themeApplied = signal<boolean>(false);
  private _logger = inject(LoggerService);

  constructor(private _http: HttpClient) {}

  /**
   * Load tenant branding by subdomain from the public endpoint
   */
  async loadTenantBranding(subdomain: string): Promise<void> {
    try {
      const url = `${environment.apiUrl}/api/tenants/branding/${subdomain}`;
      const branding = await this._http.get<TenantBranding>(url).toPromise();

      if (branding) {
        this._currentBranding.set(branding);
        this._applyTheme(branding);
      }
    } catch (error) {
      this._logger.warn('Failed to load tenant branding, using defaults:', error);
      this._applyDefaultTheme();
    }
  }

  /**
   * Extract subdomain from current hostname or query parameter
   * Returns null if no subdomain found
   * Supports:
   * - Subdomain: restaurant-a.localhost, restaurant.example.com
   * - Query parameter: ?tenant=restaurant-a (for network IP access)
   */
  getSubdomainFromHostname(): string | null {
    const hostname = window.location.hostname;

    // First, try to extract from query parameter (useful for network IP access)
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) {
      return tenantParam;
    }

    // Development: localhost with subdomain (e.g., restaurant-a.localhost)
    if (hostname.endsWith('.localhost')) {
      const parts = hostname.split('.');
      if (parts.length >= 2) {
        return parts[0]; // Return subdomain part
      }
    }

    // Production: subdomain.yourdomain.com
    if (
      hostname !== 'localhost' &&
      !hostname.startsWith('127.') &&
      !hostname.startsWith('192.168.')
    ) {
      const parts = hostname.split('.');
      if (parts.length >= 3) {
        return parts[0]; // Return subdomain part
      }
    }

    return null;
  }

  /**
   * Initialize theme on app startup
   */
  async initializeTheme(): Promise<void> {
    const subdomain = this.getSubdomainFromHostname();

    if (subdomain) {
      await this.loadTenantBranding(subdomain);
    } else {
      // No subdomain, use default theme
      this._applyDefaultTheme();
    }
  }

  /**
   * Apply theme to the document by setting CSS custom properties
   */
  private _applyTheme(branding: TenantBranding): void {
    const root = document.documentElement;

    // Apply color custom properties
    if (branding.primaryColor) {
      root.style.setProperty('--tenant-primary-color', branding.primaryColor);
    }
    if (branding.secondaryColor) {
      root.style.setProperty('--tenant-secondary-color', branding.secondaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty('--tenant-accent-color', branding.accentColor);
    }
    if (branding.backgroundColor) {
      root.style.setProperty('--tenant-background-color', branding.backgroundColor);
    }
    if (branding.textColor) {
      root.style.setProperty('--tenant-text-color', branding.textColor);
    }

    // Apply favicon if provided
    if (branding.faviconUrl) {
      this._updateFavicon(branding.faviconUrl);
    }

    // Apply custom CSS if provided
    if (branding.customCss) {
      this._injectCustomCss(branding.customCss);
    }

    this._themeApplied.set(true);
    this._logger.debug('Tenant theme applied:', branding);
  }

  /**
   * Apply default theme colors
   */
  private _applyDefaultTheme(): void {
    const defaultBranding: TenantBranding = {
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#f093fb',
      backgroundColor: '#ffffff',
      textColor: '#333333',
    };

    this._currentBranding.set(defaultBranding);
    this._applyTheme(defaultBranding);
  }

  /**
   * Update favicon dynamically
   */
  private _updateFavicon(faviconUrl: string): void {
    // Remove existing favicon links
    const existingLinks = document.querySelectorAll("link[rel*='icon']");
    existingLinks.forEach((link) => link.remove());

    // Add new favicon
    const link = document.createElement('link');
    link.rel = 'icon';
    link.type = 'image/x-icon';
    link.href = faviconUrl;
    document.head.appendChild(link);
  }

  /**
   * Inject custom CSS into the document
   */
  private _injectCustomCss(css: string): void {
    // Remove existing custom tenant CSS
    const existingStyle = document.getElementById('tenant-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    // Add new custom CSS
    const style = document.createElement('style');
    style.id = 'tenant-custom-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  /**
   * Get current branding (readonly signal)
   */
  getBranding() {
    return this._currentBranding.asReadonly();
  }

  /**
   * Check if theme has been applied
   */
  isThemeApplied() {
    return this._themeApplied.asReadonly();
  }

  /**
   * Force reload theme (useful after saving changes)
   */
  async reloadTheme(): Promise<void> {
    const subdomain = this.getSubdomainFromHostname();
    if (subdomain) {
      await this.loadTenantBranding(subdomain);
    }
  }
}
