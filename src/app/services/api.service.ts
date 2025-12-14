import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { Table, TableQRCode, ServiceRequest, Tenant, User, RequestTypeConfig } from '../models/types';
import { AuthService } from './auth.service';
import { UrlUtilsService } from './url-utils.service';
import { LoggerService } from './logger.service';

export interface AnalyticsSummary {
  totalRequests: number;
  pendingRequests: number;
  completedRequests: number;
  averageResponseTime: number;
  requestsByType: Record<string, number>;
  requestsByTable: Record<string, number>; // Changed from number to string (UUID)
}

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private _http = inject(HttpClient);
  private _authService = inject(AuthService);
  private _apiUrl = environment.apiUrl;
  private _urlUtils = inject(UrlUtilsService);
  private _logger = inject(LoggerService);

  // Expose API URL for direct backend access (e.g., print pages)
  getApiUrl(): string {
    return this._apiUrl;
  }

  // Table Management
  getTables(): Observable<Table[]> {
    return this._http.get<Table[]>(`${this._apiUrl}/api/tables`, {
      headers: this._getTableHeaders(),
    });
  }

  getTableById(id: string): Observable<Table> {
    return this._http.get<Table>(`${this._apiUrl}/api/tables/${id}`, {
      headers: this._getTableHeaders(),
    });
  }

  getTablesByIds(ids: string[]): Observable<Table[]> {
    return this._http.post<Table[]>(`${this._apiUrl}/api/tables/batch`, { ids }, {
      headers: this._getTableHeaders(),
    });
  }

  createTable(table: Partial<Table>): Observable<Table> {
    return this._http.post<Table>(`${this._apiUrl}/api/tables`, table, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateTable(id: string, table: Partial<Table>): Observable<Table> {
    return this._http.put<Table>(`${this._apiUrl}/api/tables/${id}`, table, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  deleteTable(id: string): Observable<void> {
    return this._http.delete<void>(`${this._apiUrl}/api/tables/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // QR Code Management
  getTableQRCodes(): Observable<TableQRCode[]> {
    return this._http.get<TableQRCode[]>(`${this._apiUrl}/api/tables/qr-codes`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getTableQRCode(id: string): Observable<TableQRCode> {
    return this._http.get<TableQRCode>(`${this._apiUrl}/api/tables/${id}/qr-code`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateTableQRUrls(tableIds?: string[]): Observable<{ message: string; tables: Table[] }> {
    return this._http.post<{ message: string; tables: Table[] }>(
      `${this._apiUrl}/api/tables/qr-codes/update`,
      { tableIds },
      {
        headers: this._authService.getAuthHeaders(),
      }
    );
  }

  downloadQRStickersZip(): Observable<Blob> {
    return this._http.get(`${this._apiUrl}/api/tables/qr-codes/download`, {
      headers: this._authService.getAuthHeaders(),
      responseType: 'blob',
    });
  }

  downloadClassicQRCodesZip(): Observable<Blob> {
    return this._http.get(`${this._apiUrl}/api/tables/qr-codes/download-classic`, {
      headers: this._authService.getAuthHeaders(),
      responseType: 'blob',
    });
  }

  downloadTableQRCode(tableId: string, format: 'png' | 'svg' = 'png'): Observable<Blob> {
    return this._http.get(`${this._apiUrl}/api/tables/qr-codes/${tableId}/download?format=${format}`, {
      headers: this._authService.getAuthHeaders(),
      responseType: 'blob',
    });
  }

  downloadTableSticker(tableId: string): Observable<Blob> {
    return this._http.get(`${this._apiUrl}/api/tables/qr-codes/${tableId}/sticker/download`, {
      headers: this._authService.getAuthHeaders(),
      responseType: 'blob',
    });
  }

  getTableQRStickers(): Observable<Array<{ tableId: string; tableNumber: string; name?: string; stickerImage: string }>> {
    return this._http.get<Array<{ tableId: string; tableNumber: string; name?: string; stickerImage: string }>>(
      `${this._apiUrl}/api/tables/qr-codes/stickers`,
      {
        headers: this._authService.getAuthHeaders(),
      }
    );
  }

  // Tenant Management
  getTenants(): Observable<Tenant[]> {
    return this._http.get<Tenant[]>(`${this._apiUrl}/api/tenants`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getTenant(id: string): Observable<Tenant> {
    return this._http.get<Tenant>(`${this._apiUrl}/api/tenants/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  createTenant(tenant: Omit<Tenant, 'id' | 'createdAt' | 'updatedAt'>): Observable<Tenant> {
    return this._http.post<Tenant>(`${this._apiUrl}/api/tenants`, tenant, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateTenant(id: string, tenant: Partial<Tenant>): Observable<Tenant> {
    return this._http.put<Tenant>(`${this._apiUrl}/api/tenants/${id}`, tenant, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  deleteTenant(id: string): Observable<void> {
    return this._http.delete<void>(`${this._apiUrl}/api/tenants/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // User Management
  getUsers(): Observable<User[]> {
    return this._http.get<User[]>(`${this._apiUrl}/api/users`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getAllUsers(): Observable<User[]> {
    return this._http.get<User[]>(`${this._apiUrl}/api/superadmin/users`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  createSuperAdminUser(
    user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>,
  ): Observable<User> {
    return this._http.post<User>(`${this._apiUrl}/api/superadmin/users`, user, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateSuperAdminUser(id: string, user: Partial<User>): Observable<User> {
    return this._http.put<User>(`${this._apiUrl}/api/superadmin/users/${id}`, user, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  deleteSuperAdminUser(id: string): Observable<void> {
    return this._http.delete<void>(`${this._apiUrl}/api/superadmin/users/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // ============================================
  // SUPERADMIN ANALYTICS & MONITORING
  // ============================================

  getSuperAdminAnalytics(): Observable<any> {
    return this._http.get(`${this._apiUrl}/api/superadmin/analytics`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getSuperAdminAuditLogs(limit?: number): Observable<any[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this._http.get<any[]>(`${this._apiUrl}/api/superadmin/audit-logs${params}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getTenantAuditLogs(tenantId: string, limit?: number): Observable<any[]> {
    const params = limit ? `?limit=${limit}` : '';
    return this._http.get<any[]>(
      `${this._apiUrl}/api/superadmin/tenants/${tenantId}/audit-logs${params}`,
      {
        headers: this._authService.getAuthHeaders(),
      },
    );
  }

  getAllSubscriptions(): Observable<any[]> {
    return this._http.get<any[]>(`${this._apiUrl}/api/superadmin/subscriptions`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // ============================================
  // SUPERADMIN TENANT MANAGEMENT
  // ============================================

  getAllTenantsWithSubscriptions(): Observable<any[]> {
    return this._http.get<any[]>(`${this._apiUrl}/api/superadmin/tenants`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getSuperAdminTenantDetails(tenantId: string): Observable<any> {
    return this._http.get(`${this._apiUrl}/api/superadmin/tenants/${tenantId}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  createSuperAdminTenant(tenant: any): Observable<any> {
    return this._http.post(`${this._apiUrl}/api/superadmin/tenants`, tenant, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateSuperAdminTenant(tenantId: string, updates: any): Observable<any> {
    return this._http.put(`${this._apiUrl}/api/superadmin/tenants/${tenantId}`, updates, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  toggleTenantStatus(tenantId: string, active: boolean): Observable<any> {
    return this._http.patch(
      `${this._apiUrl}/api/superadmin/tenants/${tenantId}/status`,
      { active },
      {
        headers: this._authService.getAuthHeaders(),
      },
    );
  }

  deleteSuperAdminTenant(tenantId: string): Observable<void> {
    return this._http.delete<void>(`${this._apiUrl}/api/superadmin/tenants/${tenantId}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getUser(id: string): Observable<User> {
    return this._http.get<User>(`${this._apiUrl}/api/users/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  createUser(user: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin'>): Observable<User> {
    return this._http.post<User>(`${this._apiUrl}/api/users`, user, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateUser(id: string, user: Partial<User>): Observable<User> {
    return this._http.put<User>(`${this._apiUrl}/api/users/${id}`, user, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  deleteUser(id: string): Observable<void> {
    return this._http.delete<void>(`${this._apiUrl}/api/users/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // Service Requests Management
  getServiceRequests(params?: any): Observable<any> {
    const queryParams = params ? new URLSearchParams(params).toString() : '';
    const url = queryParams
      ? `${this._apiUrl}/api/service-requests?${queryParams}`
      : `${this._apiUrl}/api/service-requests`;
    return this._http.get(url, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getServiceRequest(id: string): Observable<ServiceRequest> {
    return this._http.get<ServiceRequest>(`${this._apiUrl}/api/service-requests/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateServiceRequest(id: string, request: Partial<ServiceRequest>): Observable<ServiceRequest> {
    return this._http.put<ServiceRequest>(`${this._apiUrl}/api/service-requests/${id}`, request, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  deleteServiceRequest(id: string): Observable<void> {
    return this._http.delete<void>(`${this._apiUrl}/api/service-requests/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  acknowledgeServiceRequest(id: string, acknowledgedBy: string): Observable<ServiceRequest> {
    return this._http.put<ServiceRequest>(
      `${this._apiUrl}/api/service-requests/${id}/acknowledge`,
      { acknowledgedBy },
      {
        headers: this._authService.getAuthHeaders(),
      },
    );
  }

  completeServiceRequest(id: string): Observable<ServiceRequest> {
    return this._http.put<ServiceRequest>(
      `${this._apiUrl}/api/service-requests/${id}/complete`,
      {},
      {
        headers: this._authService.getAuthHeaders(),
      },
    );
  }

  // Requests (Legacy - keeping for backward compatibility)
  getRequests(): Observable<ServiceRequest[]> {
    return this._http.get<ServiceRequest[]>(`${this._apiUrl}/api/requests`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getActiveRequests(): Observable<ServiceRequest[]> {
    return this._http.get<ServiceRequest[]>(`${this._apiUrl}/api/requests/active`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getActiveRequestsFromDb(): Observable<ServiceRequest[]> {
    // Extract tenant subdomain from current URL to pass to backend - STRICT: no fallbacks
    // This ensures proper tenant isolation
    try {
      const tenantSubdomain = this._extractTenantFromUrl();
      this._logger.debug(`Requesting active requests for tenant: ${tenantSubdomain}`);

      // Get existing auth headers and add tenant subdomain header
      const authHeaders = this._authService.getAuthHeaders();
      const headers = new HttpHeaders({
        ...Object.fromEntries(authHeaders.keys().map((key) => [key, authHeaders.get(key) || ''])),
        'X-Tenant-Subdomain': tenantSubdomain,
      });

      return this._http.get<ServiceRequest[]>(`${this._apiUrl}/api/requests/active-db`, {
        headers: headers,
      });
    } catch {
      // Return error observable if tenant extraction fails
      return new Observable((observer) => {
        observer.error({
          error: 'Tenant subdomain is required',
          message: 'Please access via subdomain (e.g., a.localhost:4200)',
        });
      });
    }
  }

  /**
   * Extract tenant subdomain from current URL - STRICT: no fallbacks
   * Supports: a.localhost, restaurant.example.com, etc.
   * Throws error if no tenant subdomain found
   */
  private _extractTenantFromUrl(): string {
    return this._urlUtils.extractTenantFromUrl();
  }

  // Analytics
  getAnalyticsSummary(): Observable<AnalyticsSummary> {
    return this._http.get<AnalyticsSummary>(`${this._apiUrl}/api/analytics/summary`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // Health Check
  healthCheck(): Observable<{ status: string; timestamp: string }> {
    return this._http.get<{ status: string; timestamp: string }>(`${this._apiUrl}/api/health`);
  }

  // Tenant Branding
  getTenantBranding(subdomain: string): Observable<any> {
    return this._http.get(`${this._apiUrl}/api/tenants/branding/${subdomain}`);
  }

  // Get current user's tenant
  getMyTenant(): Observable<any> {
    return this._http.get(`${this._apiUrl}/api/tenants/me`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // Branding API (simplified)
  getMyBranding(): Observable<any> {
    this._logger.debug('API: Fetching branding from /api/branding');
    return this._http.get(`${this._apiUrl}/api/branding`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateMyBranding(branding: any): Observable<any> {
    this._logger.debug('API: Updating branding at /api/branding', branding);
    return this._http.put(`${this._apiUrl}/api/branding`, branding, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // Legacy methods (kept for backward compatibility)
  updateTenantBranding(tenantId: string, branding: any): Observable<any> {
    return this._http.put(`${this._apiUrl}/api/tenants/${tenantId}/branding`, branding, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // Request Type Management
  getRequestTypes(activeOnly = false): Observable<RequestTypeConfig[]> {
    const url = activeOnly 
      ? `${this._apiUrl}/api/request-types?activeOnly=true`
      : `${this._apiUrl}/api/request-types`;
    return this._http.get<RequestTypeConfig[]>(url, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  getPublicRequestTypes(): Observable<RequestTypeConfig[]> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'X-Tenant-Subdomain': this._extractTenantFromUrl(),
    });
    
    return this._http.get<RequestTypeConfig[]>(`${this._apiUrl}/api/request-types/public`, {
      headers,
    });
  }

  createRequestType(data: Partial<RequestTypeConfig>): Observable<RequestTypeConfig> {
    return this._http.post<RequestTypeConfig>(`${this._apiUrl}/api/request-types`, data, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  updateRequestType(id: string, data: Partial<RequestTypeConfig>): Observable<RequestTypeConfig> {
    return this._http.put<RequestTypeConfig>(`${this._apiUrl}/api/request-types/${id}`, data, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  deleteRequestType(id: string): Observable<void> {
    return this._http.delete<void>(`${this._apiUrl}/api/request-types/${id}`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  reorderRequestTypes(orderedIds: string[]): Observable<{ message: string }> {
    return this._http.put<{ message: string }>(`${this._apiUrl}/api/request-types/reorder`, { orderedIds }, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  // ============================================
  // INTEGRATIONS API
  // ============================================

  /**
   * Get all integration settings
   */
  getIntegrations(): Observable<any> {
    return this._http.get(`${this._apiUrl}/api/integrations`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Get printer integration settings
   */
  getPrinterIntegration(): Observable<any> {
    return this._http.get(`${this._apiUrl}/api/integrations/printer`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Update printer integration settings
   */
  updatePrinterIntegration(data: any): Observable<any> {
    return this._http.put(`${this._apiUrl}/api/integrations/printer`, data, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Test printer connection
   */
  testPrinterIntegration(): Observable<any> {
    return this._http.post(`${this._apiUrl}/api/integrations/printer/test`, {}, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Get speaker integration settings
   */
  getSpeakerIntegration(): Observable<any> {
    return this._http.get(`${this._apiUrl}/api/integrations/speaker`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Update speaker integration settings
   */
  updateSpeakerIntegration(data: any): Observable<any> {
    return this._http.put(`${this._apiUrl}/api/integrations/speaker`, data, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Test speaker connection
   */
  testSpeakerIntegration(): Observable<any> {
    return this._http.post(`${this._apiUrl}/api/integrations/speaker/test`, {}, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Get webhook integration settings
   */
  getWebhookIntegration(): Observable<any> {
    return this._http.get(`${this._apiUrl}/api/integrations/webhook`, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Update webhook integration settings
   */
  updateWebhookIntegration(data: any): Observable<any> {
    return this._http.put(`${this._apiUrl}/api/integrations/webhook`, data, {
      headers: this._authService.getAuthHeaders(),
    });
  }

  /**
   * Get headers for table requests (public access for customers, auth for admins)
   */
  private _getTableHeaders(): HttpHeaders {
    const headers: { [key: string]: string } = {
      'Content-Type': 'application/json',
    };

    // Add tenant subdomain header
    try {
      const tenantSubdomain = this._extractTenantFromUrl();
      headers['X-Tenant-Subdomain'] = tenantSubdomain;
    } catch (error) {
      this._logger.warn('Could not extract tenant subdomain:', error);
    }

    // If user is authenticated, add auth headers to allow showing inactive tables for admins
    const authHeaders = this._authService.getAuthHeaders();
    if (authHeaders.has('Authorization')) {
      headers['Authorization'] = authHeaders.get('Authorization') || '';
    }

    return new HttpHeaders(headers);
  }
}
