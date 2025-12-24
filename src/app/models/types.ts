export interface Table {
  id: string; // UUID
  tenantId: string;
  tableNumber: string; // Display identifier like "T-01", "Table 5"
  name?: string; // Optional friendly name
  qrCodeUrl?: string;
  status: 'active' | 'inactive';
  zone?: string;
  capacity?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TableQRCode {
  tableId: string;
  tableNumber: string;
  name?: string;
  qrUrl: string;
  qrImage: string;
  zone?: string;
  capacity?: number;
  status: 'active' | 'inactive';
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  subdomain: string;
  plan: string;
  maxTables: number;
  maxUsers: number;
  active: boolean;
  settings: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface User {
  id: string;
  tenantId: string;
  username: string;
  email: string;
  role: UserRole;
  fullName: string;
  active: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isSuperAdmin?: boolean;
  tenantName?: string;
  tenantSubdomain?: string;
  tenantSlug?: string;
  password?: string; // for user creation only
}

export interface ServiceRequest {
  id: string;
  tenantId: string;
  tableId: string; // UUID of the table
  requestType: RequestType;
  status: RequestStatus;
  customNote?: string;
  timestampCreated: Date;
  timestampAcknowledged: Date | null;
  timestampCompleted: Date | null;
  acknowledgedBy: string | null;
  completedBy?: 'waiter' | 'customer' | null; // Who completed the request
  durationSeconds: number | null;
  createdAt: Date;
  updatedAt: Date;
  tenantName?: string;
  tableNumber?: string; // Display name from join
  acknowledgedByUser?: string;
  // Request type enriched data (from join)
  requestTypeNameEn?: string;
  requestTypeNameAr?: string;
  requestTypeIcon?: string;
  // Feedback data (from join)
  feedbackRating?: number | null;
  feedbackComments?: string | null;
  feedbackCustomerName?: string | null;
  feedbackCustomerPhone?: string | null;
}

export type RequestType = 'call_waiter' | 'bill' | 'assistance' | 'custom';
export type RequestStatus = 'pending' | 'acknowledged' | 'completed' | 'cancelled';
export type UserRole = 'admin' | 'manager' | 'waiter' | 'customer' | 'superadmin';

export interface RequestTypeConfig {
  id: string;
  tenantId: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  displayOrder: number;
  active: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Authentication types
export interface LoginRequest {
  identifier: string; // email or username
  password: string;
  tenantId?: string; // for tenant-scoped login
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  tenantId?: string;
  tenantSubdomain?: string;
  tenantSlug?: string;
  isSuperAdmin?: boolean;
  exp: number;
  iat: number;
}

export interface SocketEvents {
  // Client to Server
  join: (room: string) => void;
  call_waiter: (data: { tableId: string; type: RequestType }) => void;
  acknowledge_request: (requestId: string) => void;
  complete_request: (requestId: string) => void;

  // Server to Client
  new_request: (request: ServiceRequest) => void;
  request_sent: (request: ServiceRequest) => void;
  request_updated: (request: ServiceRequest) => void;
  request_status: (request: ServiceRequest) => void;
  error: (message: string) => void;
}
