const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(method: string, path: string, body?: any, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, err.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  get: <T>(path: string, token?: string | null) => request<T>('GET', path, undefined, token),
  post: <T>(path: string, body?: any, token?: string | null) => request<T>('POST', path, body, token),
  put: <T>(path: string, body?: any, token?: string | null) => request<T>('PUT', path, body, token),
  delete: <T>(path: string, token?: string | null) => request<T>('DELETE', path, undefined, token),
};

export { ApiError };
