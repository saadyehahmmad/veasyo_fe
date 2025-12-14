import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class UrlUtilsService {
  /**
   * Extract tenant subdomain from current URL
   * Supports:
   * - Subdomain: a.localhost, restaurant.example.com
   * - Query parameter: ?tenant=restaurant-a (for network IP access)
   * Throws error if no tenant found
   */
  extractTenantFromUrl(): string {
    const hostname = window.location.hostname;

    // First, try to extract from query parameter (useful for network IP access)
    const urlParams = new URLSearchParams(window.location.search);
    const tenantParam = urlParams.get('tenant');
    if (tenantParam) {
      return tenantParam;
    }

    // Handle localhost with subdomain (e.g., a.localhost)
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
        return parts[0]; // Return subdomain before .localhost
      }
      throw new Error(
        'Tenant subdomain is required. Please access via subdomain (e.g., a.localhost:4200) or query parameter (e.g., ?tenant=a)',
      );
    }

    // Handle regular subdomains (e.g., restaurant.example.com)
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return parts[0]; // Return subdomain
    }

    // Check if accessing via IP address (network access)
    const isIpAddress = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
    if (isIpAddress) {
      throw new Error(
        'Tenant subdomain is required. When accessing via IP address, please use query parameter: ?tenant=restaurant-a',
      );
    }

    // Throw error if no tenant found
    throw new Error(
      'Tenant subdomain is required. Please access via subdomain (e.g., restaurant.example.com) or query parameter (e.g., ?tenant=restaurant-a)',
    );
  }

  /**
   * Extract subdomain from hostname (static method for backend compatibility)
   * Examples:
   * - restaurant-abc.waiter-app.com → restaurant-abc
   * - a.localhost → a (for development)
   * - localhost → null
   * - waiter-app.com → null
   */
  static extractSubdomain(hostname: string): string | null {
    // Handle localhost with subdomain (e.g., a.localhost)
    if (hostname.includes('localhost')) {
      const parts = hostname.split('.');
      if (parts.length >= 2 && parts[0] !== 'localhost' && parts[0] !== 'www') {
        return parts[0]; // Return subdomain before .localhost
      }
      return null;
    }

    // Skip IP addresses
    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
      return null;
    }

    const parts = hostname.split('.');

    // Need at least 3 parts for subdomain (subdomain.domain.tld)
    if (parts.length < 3) {
      return null;
    }

    // Return first part as subdomain
    return parts[0];
  }
}
