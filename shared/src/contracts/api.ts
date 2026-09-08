/**
 * Enterprise ERP API Contracts
 * Defines standard request, response, and error payloads for frontend-backend communication.
 */

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    companyId?: string;
    userId?: string;
    traceId?: string;
  };
}

export interface PaginatedResponse<T = any> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TenantContextHeaders {
  'x-company-id': string;
  'x-user-id': string;
  'x-user-role': string;
}

export interface AuthLoginRequest {
  email: string;
  password?: string;
  companyId?: string;
}

export interface AuthLoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    name: string;
    companyId: string;
    role: string;
  };
}
