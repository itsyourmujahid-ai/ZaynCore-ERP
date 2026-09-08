/**
 * Enterprise ERP Frontend API Client
 * Provides typed HTTP communication with the backend REST API
 */

export interface ApiClientConfig {
  baseUrl?: string;
  getCompanyId?: () => string | null;
  getUserId?: () => string | null;
  getUserRole?: () => string | null;
}

export class ApiClient {
  private baseUrl: string;
  private getCompanyId: () => string | null;
  private getUserId: () => string | null;
  private getUserRole: () => string | null;

  constructor(config: ApiClientConfig = {}) {
    this.baseUrl = config.baseUrl || "/api";
    this.getCompanyId = config.getCompanyId || (() => localStorage.getItem("erp_active_company_id"));
    this.getUserId = config.getUserId || (() => localStorage.getItem("erp_active_user_id"));
    this.getUserRole = config.getUserRole || (() => localStorage.getItem("erp_active_user_role"));
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    const token = typeof localStorage !== 'undefined' ? localStorage.getItem("erp_auth_token") : null;
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const companyId = this.getCompanyId();
    if (companyId) headers["x-company-id"] = companyId;

    const userId = this.getUserId();
    if (userId) headers["x-user-id"] = userId;

    const userRole = this.getUserRole();
    if (userRole) headers["x-user-role"] = userRole;

    return headers;
  }

  async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  async post<T>(path: string, data?: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  async put<T>(path: string, data?: any): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "PUT",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.getHeaders()
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `HTTP ${res.status}: ${res.statusText}`);
    }
    return res.json();
  }
}

export const apiClient = new ApiClient();
