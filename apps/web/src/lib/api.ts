'use client';

import { supabase, getAccessToken } from '@/lib/supabase';

/**
 * Typed API client with automatic auth token injection,
 * timeout, retry, and error handling.
 *
 * Replaces the previous untyped api.ts module.
 * All responses are typed via generics.
 */

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions {
  timeout?: number;
  retries?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT = 15000;
const DEFAULT_RETRIES = 1;
const RETRY_DELAY = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number,
  signal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Combine external signal with our timeout signal
  if (signal) {
    signal.addEventListener('abort', () => controller.abort());
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make an authenticated API request.
 * Automatically injects the Supabase access token.
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestOptions = {}
): Promise<T> {
  const timeout = options.timeout || DEFAULT_TIMEOUT;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const token = await getAccessToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
  };

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    fetchOptions.body = JSON.stringify(body);
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${apiUrl}/api${path}`,
        fetchOptions,
        timeout,
        options.signal
      );

      // Handle 401 — session may have expired
      if (response.status === 401) {
        // Try refreshing the session
        const { data: { session } } = await supabase.auth.refreshSession();
        if (session) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
          // Retry with new token
          const retryResponse = await fetchWithTimeout(
            `${apiUrl}/api${path}`,
            { ...fetchOptions, headers },
            timeout,
            options.signal
          );
          return handleResponse<T>(retryResponse);
        }
        throw new ApiError('UNAUTHORIZED', 'Session expired. Please sign in again.', 401);
      }

      return handleResponse<T>(response);
    } catch (error) {
      lastError = error as Error;

      // Don't retry on 4xx errors (except 401, handled above)
      if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Retry on network errors and 5xx
      if (attempt < retries) {
        await sleep(RETRY_DELAY * (attempt + 1));
        continue;
      }
    }
  }

  throw lastError || new ApiError('NETWORK_ERROR', 'Request failed', 0);
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const error = data?.error || {};
    throw new ApiError(
      error.code || 'UNKNOWN_ERROR',
      error.message || `Request failed with status ${response.status}`,
      response.status,
      error.details
    );
  }

  return data as T;
}

/**
 * API client — typed methods for all backend endpoints.
 */
export const api = {
  get<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('GET', path, undefined, options);
  },

  post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('POST', path, body, options);
  },

  patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PATCH', path, body, options);
  },

  put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>('PUT', path, body, options);
  },

  delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return request<T>('DELETE', path, undefined, options);
  },
};
