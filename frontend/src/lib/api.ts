const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface FetchOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>
}

class ApiClient {
  private token: string | null = null

  setToken(token: string | null) {
    this.token = token
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('syncsaga_token', token)
      else localStorage.removeItem('syncsaga_token')
    }
  }

  loadToken(): string | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem('syncsaga_token')
    if (stored) this.token = stored
    return this.token
  }

  private async request<T>(endpoint: string, opts: FetchOptions = {}): Promise<T> {
    const { params, ...init } = opts
    const url = new URL(`${API_URL}${endpoint}`)
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined) url.searchParams.set(k, String(v))
      })
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(init.headers as Record<string, string>),
    }
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`

    const res = await fetch(url.toString(), { ...init, headers })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'API request failed')
    }
    return res.json()
  }

  get<T>(endpoint: string, opts?: FetchOptions) {
    return this.request<T>(endpoint, { ...opts, method: 'GET' })
  }

  post<T>(endpoint: string, body?: unknown, opts?: FetchOptions) {
    return this.request<T>(endpoint, { ...opts, method: 'POST', body: JSON.stringify(body) })
  }

  put<T>(endpoint: string, body?: unknown, opts?: FetchOptions) {
    return this.request<T>(endpoint, { ...opts, method: 'PUT', body: JSON.stringify(body) })
  }

  delete<T>(endpoint: string, opts?: FetchOptions) {
    return this.request<T>(endpoint, { ...opts, method: 'DELETE' })
  }
}

export const api = new ApiClient()

export const auth = {
  login: (username: string, password: string) =>
    api.post<{ access_token: string; token_type: string }>('/api/auth/login', { username, password }),
  register: (username: string, password: string, display_name: string) =>
    api.post<{ access_token: string; token_type: string }>('/api/auth/register', { username, password, display_name }),
}

export const rooms = {
  list: (page = 1, per_page = 20) =>
    api.get<{ items: import('@/types').Room[]; total: number; page: number; per_page: number }>('/api/rooms', { params: { page, per_page } }),
  get: (id: string) =>
    api.get<import('@/types').Room>(`/api/rooms/${id}`),
  create: (data: Partial<import('@/types').Room>) =>
    api.post<import('@/types').Room>('/api/rooms', data),
  join: (id: string) =>
    api.post<{ joined: boolean }>(`/api/rooms/${id}/join`),
  leave: (id: string) =>
    api.post<{ left: boolean }>(`/api/rooms/${id}/leave`),
}

export const sync = {
  postEvent: (roomId: string, event: Partial<import('@/types').SyncEvent>) =>
    api.post<import('@/types').SyncEvent>(`/api/sync/${roomId}/event`, event),
  getState: (roomId: string) =>
    api.get<import('@/types').SyncState>(`/api/sync/${roomId}/state`),
  getHealth: (roomId: string) =>
    api.get<{ healthy: boolean; confidence: number; active_method: string; latency_ms: number }>(`/api/sync/${roomId}/health`),
}

export const ai = {
  matchEpisode: (roomId: string, mediaUrl: string, episode: number) =>
    api.post<import('@/types').DetectionResult>('/api/ai/match-episode', { room_id: roomId, media_url: mediaUrl, episode }),
  detect: (roomId: string, mediaUrl: string) =>
    api.post<import('@/types').DetectionResult>('/api/ai/detect', { room_id: roomId, media_url: mediaUrl }),
  status: () =>
    api.get<{ services: Record<string, string>; models_loaded: string[] }>('/api/ai/status'),
}

export const clips = {
  list: (roomId: string) =>
    api.get<import('@/types').Clip[]>(`/api/clips/${roomId}`),
  create: (roomId: string, data: Partial<import('@/types').Clip>) =>
    api.post<import('@/types').Clip>(`/api/clips/${roomId}`, data),
}

export const feed = {
  list: (page = 1, per_page = 20) =>
    api.get<{ items: import('@/types').ActivityEvent[]; total: number; page: number; per_page: number }>('/api/feed', { params: { page, per_page } }),
}
