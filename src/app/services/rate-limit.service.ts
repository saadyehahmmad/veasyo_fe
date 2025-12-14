import { Injectable, inject, signal } from '@angular/core';
import { LoggerService } from './logger.service';

/**
 * Client-side rate limiting service
 * Prevents excessive API calls from the client side
 * This is a complement to server-side rate limiting, not a replacement
 */
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable({
  providedIn: 'root',
})
export class RateLimitService {
  private _logger = inject(LoggerService);
  
  // Rate limit storage (in-memory, cleared on page refresh)
  private _rateLimits = new Map<string, RateLimitEntry>();
  
  // Configuration
  private readonly DEFAULT_LIMIT = 100; // requests
  private readonly DEFAULT_WINDOW = 15 * 60 * 1000; // 15 minutes in milliseconds
  
  // Rate limit status signal
  public isRateLimited = signal(false);
  public rateLimitInfo = signal<{ remaining: number; resetTime: number } | null>(null);

  /**
   * Check if a request should be allowed based on rate limits
   * @param endpoint - API endpoint identifier (e.g., '/api/tables')
   * @param limit - Maximum requests allowed (default: 100)
   * @param windowMs - Time window in milliseconds (default: 15 minutes)
   * @returns true if request should be allowed, false if rate limited
   */
  checkRateLimit(
    endpoint: string,
    limit: number = this.DEFAULT_LIMIT,
    windowMs: number = this.DEFAULT_WINDOW,
  ): boolean {
    const now = Date.now();
    const key = endpoint;
    
    // Get or create rate limit entry
    let entry = this._rateLimits.get(key);
    
    // If entry doesn't exist or window has expired, create new entry
    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      this._rateLimits.set(key, entry);
    }
    
    // Increment request count
    entry.count++;
    
    // Check if limit exceeded
    if (entry.count > limit) {
      const remaining = Math.ceil((entry.resetTime - now) / 1000); // seconds until reset
      this.isRateLimited.set(true);
      this.rateLimitInfo.set({
        remaining: 0,
        resetTime: entry.resetTime,
      });
      
      this._logger.warn('Client-side rate limit exceeded', {
        endpoint,
        count: entry.count,
        limit,
        resetIn: `${remaining}s`,
      });
      
      return false;
    }
    
    // Update rate limit info
    const remaining = limit - entry.count;
    this.isRateLimited.set(false);
    this.rateLimitInfo.set({
      remaining,
      resetTime: entry.resetTime,
    });
    
    return true;
  }

  /**
   * Reset rate limit for a specific endpoint
   */
  resetRateLimit(endpoint: string): void {
    this._rateLimits.delete(endpoint);
    this._logger.info('Rate limit reset', { endpoint });
  }

  /**
   * Reset all rate limits
   */
  resetAllRateLimits(): void {
    this._rateLimits.clear();
    this.isRateLimited.set(false);
    this.rateLimitInfo.set(null);
    this._logger.info('All rate limits reset');
  }

  /**
   * Get current rate limit status for an endpoint
   */
  getRateLimitStatus(endpoint: string): { count: number; limit: number; resetTime: number } | null {
    const entry = this._rateLimits.get(endpoint);
    if (!entry) {
      return null;
    }
    
    return {
      count: entry.count,
      limit: this.DEFAULT_LIMIT,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired rate limit entries (call periodically)
   */
  cleanupExpiredEntries(): void {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this._rateLimits.entries()) {
      if (now > entry.resetTime) {
        this._rateLimits.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      this._logger.debug('Cleaned up expired rate limit entries', { count: cleaned });
    }
  }
}

