/**
 * Subscription and Pricing Models
 */

export interface PricingPlan {
  id: string;
  name: string;
  price: number; // Monthly price in USD
  maxTables: number;
  maxWaiters: number;
  features: string[];
  isCustom: boolean;
}

export interface PricingAddons {
  extraTablePrice: number;
  extraWaiterPrice: number;
  additionalPrinterPrice: number;
}

export interface CustomPlanCalculation {
  plan: 'custom';
  basePlan: string;
  basePrice: number;
  tables: number;
  waiters: number;
  printers: number;
  extraTables: number;
  extraWaiters: number;
  extraTablesCost: number;
  extraWaitersCost: number;
  printersCost: number;
  totalAddonsCost: number;
  totalPrice: number;
  breakdown: string[];
}

export interface Subscription {
  id: string;
  tenantId: string;
  plan: 'free' | 'basic' | 'standard' | 'premium' | 'custom';
  status: 'active' | 'expired' | 'cancelled' | 'suspended';
  startDate: string;
  endDate: string | null;
  lastPaymentDate?: string | null;
  nextPaymentDate?: string | null;
  amount: number | null; // in cents (1 USD = 100 cents)
  tax: number | null; // in cents (fixed amount)
  currency: string;
  paymentMethod?: string | null;
  maxTables: number; // Maximum tables allowed
  maxUsers: number; // Maximum users allowed
  createdAt: string;
  updatedAt: string;
  tenant?: {
    id: string;
    name: string;
    subdomain: string | null;
  };
}

export interface SubscriptionUsage {
  currentTables: number;
  currentWaiters: number;
  currentPrinters: number;
}

export interface SubscriptionLimits {
  maxTables: number;
  maxWaiters: number;
}

export interface SubscriptionValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestedPlan?: string;
}

export interface SubscriptionPricing {
  basePrice: number; // in USD
  addonsCost: number; // in USD
  totalPrice: number; // in USD
  breakdown: string[];
}

export interface SubscriptionDetails {
  subscription: Subscription;
  usage: SubscriptionUsage;
  limits: SubscriptionLimits;
  validation: SubscriptionValidation;
  pricing: SubscriptionPricing;
}

export interface SubscriptionAnalytics {
  total: number;
  active: number;
  expired: number;
  cancelled: number;
  suspended: number;
  byPlan: Record<string, number>;
  totalRevenue: number;
  totalMonthlyRevenue: number;
  revenueByPlan: Record<string, number>;
}

export interface CreateSubscriptionRequest {
  tenantId: string;
  plan: 'free' | 'basic' | 'standard' | 'premium' | 'custom';
  startDate: string;
  endDate: string;
  amount: number; // in USD (will be converted to cents)
  tax?: number; // in USD (will be converted to cents, optional)
  maxTables: number;
  maxUsers: number;
}

export interface UpdateSubscriptionRequest {
  plan?: 'free' | 'basic' | 'standard' | 'premium' | 'custom';
  startDate?: string;
  endDate?: string;
  amount?: number; // in USD (will be converted to cents)
  tax?: number; // in USD (will be converted to cents)
  maxTables?: number;
  maxUsers?: number;
  status?: string;
}

export interface PlanSuggestion {
  currentPlan: string;
  suggestedPlan: string;
  suggestedPlanName: string;
  suggestedPrice: number;
  reason: string;
}

export interface Invoice {
  id: string;
  subscriptionId: string;
  tenantId: string;
  amount: number;
  currency: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  dueDate: string;
  paidDate?: string;
  description: string;
  createdAt: string;
}

export interface PaymentHistory {
  id: string;
  subscriptionId: string;
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  paymentMethod: string;
  transactionId?: string;
  paidAt: string;
  description: string;
}

/**
 * Helper functions
 */
export class SubscriptionHelper {
  /**
   * Convert cents to USD
   */
  static centsToUsd(cents: number): number {
    return cents / 100;
  }

  /**
   * Convert USD to cents
   */
  static usdToCents(usd: number): number {
    return Math.round(usd * 100);
  }

  /**
   * Format price for display
   */
  static formatPrice(usd: number, _currency: string): string {
    return `$${usd.toFixed(2)}`;
  }

  /**
   * Get plan display name
   */
  static getPlanDisplayName(plan: string): string {
    const names: Record<string, string> = {
      free: 'Free Trial',
      basic: 'Basic',
      standard: 'Standard',
      premium: 'Premium',
      custom: 'Custom',
    };
    return names[plan] || plan;
  }

  /**
   * Get status color
   */
  static getStatusColor(status: string): string {
    const colors: Record<string, string> = {
      active: 'success',
      expired: 'warn',
      cancelled: 'accent',
      suspended: 'warn',
    };
    return colors[status] || 'primary';
  }

  /**
   * Get status icon
   */
  static getStatusIcon(status: string): string {
    const icons: Record<string, string> = {
      active: 'check_circle',
      expired: 'error',
      cancelled: 'cancel',
      suspended: 'pause_circle',
    };
    return icons[status] || 'info';
  }

  /**
   * Calculate days until expiration
   */
  static daysUntilExpiration(endDate: string): number {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if subscription is expiring soon (within 7 days)
   */
  static isExpiringSoon(endDate: string): boolean {
    const days = this.daysUntilExpiration(endDate);
    return days > 0 && days <= 7;
  }

  /**
   * Check if subscription is expired
   */
  static isExpired(endDate: string): boolean {
    return this.daysUntilExpiration(endDate) <= 0;
  }
}

