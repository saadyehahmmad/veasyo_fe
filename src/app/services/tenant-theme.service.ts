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
  textColor?: string;
  languageColor?: string;
  backgroundPattern?: string;
  gradientStartColor?: string;
  gradientEndColor?: string;
  gradientDirection?: string;
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

  // CSS class and property constants
  private readonly PATTERN_CLASS = 'has-pattern';
  private readonly PATTERN_IMAGE_PROPERTY = '--tenant-pattern-image';
  private readonly PATTERN_SIZE_PROPERTY = '--tenant-pattern-size';

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
    if (branding.textColor) {
      root.style.setProperty('--tenant-text-color', branding.textColor);
    }
    if (branding.languageColor) {
      root.style.setProperty('--tenant-language-color', branding.languageColor);
    }

    // Apply background and gradients
    this._applyBackgroundAndGradient(branding);

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
   * Pattern configuration interface
   */
  private readonly PATTERN_CONFIGS: Record<string, { image: string; size?: string }> = {
    dots: {
      image: 'radial-gradient(circle, rgba(0, 0, 0, 0.1) 1px, transparent 1px)',
      size: '20px 20px',
    },
    stripes: {
      image: 'repeating-linear-gradient(45deg, rgba(0, 0, 0, 0.05) 0px, rgba(0, 0, 0, 0.05) 10px, transparent 10px, transparent 20px)',
    },
    waves: {
      image: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
    },
    squares: {
      image: 'linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)',
      size: '20px 20px',
    },
    christmas: {
      image: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c41e3a' fill-opacity='0.08'%3E%3Cpath d='M40 10 L45 20 L55 20 L47 27 L50 37 L40 30 L30 37 L33 27 L25 20 L35 20 Z'/%3E%3C/g%3E%3Cg fill='%23165b33' fill-opacity='0.08'%3E%3Ccircle cx='15' cy='15' r='3'/%3E%3Ccircle cx='65' cy='15' r='3'/%3E%3Ccircle cx='15' cy='65' r='3'/%3E%3Ccircle cx='65' cy='65' r='3'/%3E%3C/g%3E%3Cg fill='%23ffd700' fill-opacity='0.06'%3E%3Ccircle cx='40' cy='60' r='2'/%3E%3Ccircle cx='20' cy='40' r='2'/%3E%3Ccircle cx='60' cy='40' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
      size: '80px 80px',
    },
  };

  /**
   * Apply background patterns and gradients
   */
  private _applyBackgroundAndGradient(branding: TenantBranding): void {
    const body = document.body;
    const root = document.documentElement;

    // Clear existing background styles
    this._clearBackgroundStyles(body, root);

    // Apply gradient to body background
    this._applyGradient(body, branding);

    // Apply pattern using CSS custom properties for ::before pseudo-element
    this._applyPattern(root, body, branding);
  }

  /**
   * Clear all background-related styles
   */
  private _clearBackgroundStyles(element: HTMLElement, root: HTMLElement): void {
    // Remove pattern class
    element.classList.remove(this.PATTERN_CLASS);
    
    // Remove inline background styles
    element.style.removeProperty('background');
    element.style.removeProperty('background-image');
    element.style.removeProperty('background-size');

    // Clear CSS custom properties for pattern
    root.style.removeProperty(this.PATTERN_IMAGE_PROPERTY);
    root.style.removeProperty(this.PATTERN_SIZE_PROPERTY);
  }

  /**
   * Apply gradient background to body
   */
  private _applyGradient(element: HTMLElement, branding: TenantBranding): void {
    const startColor = branding.gradientStartColor?.trim();
    const endColor = branding.gradientEndColor?.trim();

    if (startColor && endColor && startColor !== '' && endColor !== '') {
      const direction = branding.gradientDirection || 'to right';
      const gradient = `linear-gradient(${direction}, ${startColor}, ${endColor})`;
      element.style.backgroundImage = gradient;
    }
  }

  /**
   * Apply pattern using CSS custom properties
   */
  private _applyPattern(root: HTMLElement, body: HTMLElement, branding: TenantBranding): void {
    const patternType = branding.backgroundPattern?.trim();

    if (!patternType || patternType === '') {
      // No pattern, remove the class
      body.classList.remove(this.PATTERN_CLASS);
      return;
    }

    const patternConfig = this.PATTERN_CONFIGS[patternType];
    
    if (!patternConfig) {
      this._logger.warn(`Unknown background pattern: ${patternType}`);
      body.classList.remove(this.PATTERN_CLASS);
      return;
    }

    // Set CSS custom properties for the pattern
    root.style.setProperty(this.PATTERN_IMAGE_PROPERTY, patternConfig.image);
    if (patternConfig.size) {
      root.style.setProperty(this.PATTERN_SIZE_PROPERTY, patternConfig.size);
    } else {
      root.style.setProperty(this.PATTERN_SIZE_PROPERTY, 'auto');
    }

    // Add class to enable the ::before pseudo-element
    body.classList.add(this.PATTERN_CLASS);
  }

  /**
   * Apply default theme colors
   */
  private _applyDefaultTheme(): void {
    const defaultBranding: TenantBranding = {
      primaryColor: '#667eea',
      secondaryColor: '#764ba2',
      accentColor: '#f093fb',
      textColor: '#333333',
      languageColor: '#333333',
      gradientDirection: 'to right',
      gradientStartColor: '#667eea',
      gradientEndColor: '#764ba2',
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
