/**
 * API Service Layer with Caching & Error Handling
 */

import axios, {
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
  AxiosResponse,
  AxiosError,
} from 'axios';
import { API_CONFIG, CACHE_CONFIG } from '../config/api.config';
import { authStorage } from './authStorage';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export class APIService {
  private axiosInstance: AxiosInstance;
  private cache = new Map<string, CacheEntry<any>>();

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Version': '2.0.0',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = authStorage.getAccessToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 401) {
          const refreshToken = authStorage.getRefreshToken();
          if (refreshToken) {
            try {
              const refreshResponse = await axios.post(`${API_CONFIG.BASE_URL}/auth/refresh`, { refreshToken }, { withCredentials: true });
              const refreshed = refreshResponse.data?.data;
              if (refreshed?.accessToken) {
                authStorage.setAccessToken(refreshed.accessToken);
                if (refreshed.refreshToken) {
                  authStorage.setRefreshToken(refreshed.refreshToken);
                }
                if (refreshed.sessionId) {
                  authStorage.setSessionId(refreshed.sessionId);
                }
                error.config.headers.Authorization = `Bearer ${refreshed.accessToken}`;
                return this.axiosInstance.request(error.config);
              }
            } catch (refreshError) {
              authStorage.removeAccessToken();
              authStorage.removeRefreshToken();
              authStorage.removeSessionId();
            }
          }
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getCacheKey(method: string, url: string, data?: unknown): string {
    return `${method}:${url}:${JSON.stringify(data || {})}`;
  }

  private isCacheValid<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  public async get<T>(url: string, config?: AxiosRequestConfig, cacheTTL?: number): Promise<T> {
    const cacheKey = this.getCacheKey('GET', url);

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      return cached.data;
    }

    try {
      const response = await this.axiosInstance.get<T>(url, config);
      const data = response.data;

      // Cache if TTL provided
      if (cacheTTL) {
        this.cache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: cacheTTL,
        });
      }

      return data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.post<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.put<T>(url, data, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    try {
      const response = await this.axiosInstance.delete<T>(url, config);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  public invalidateCache(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
    } else {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    }
  }

  private handleError(error: unknown): Error {
    if (axios.isAxiosError(error)) {
      const message =
        error.response?.data?.error?.message || error.message || 'An error occurred';
      const err = new Error(message);
      (err as any).statusCode = error.response?.status;
      return err;
    }
    return error as Error;
  }
}

// Export singleton instance
export const apiService = new APIService();
