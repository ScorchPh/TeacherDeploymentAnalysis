/**
 * Centralized API service for communicating with the PHP backend.
 *
 * Configured via VITE_API_URL in frontend/.env.
 * Only edit .env when switching environments.
 */

// Strip trailing slash if present to avoid double slashes when appending routes
export const API_BASE_URL: string = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '')

/**
 * Returns the fully qualified URL for any given API endpoint path.
 *
 * Example: getApiUrl('health.php') -> "http://localhost:8000/health.php"
 */
export function getApiUrl(path: string = ''): string {
  if (!path) return API_BASE_URL
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}

export interface ApiResponse<T = unknown> {
  status: 'success' | 'error'
  message: string
  database?: string
  database_name?: string
  server_time?: string
  api_version?: string
  data?: T
  [key: string]: unknown
}

export interface DatabaseCheck {
  status: 'up' | 'degraded' | 'down'
  database: string | null
  host: string | null
  latency_ms: number | null
  tables_count: number
  message: string | null
}

export interface EnvironmentCheck {
  status: 'up' | 'down'
  env_exists: boolean
  path: string
}

export interface SystemInfo {
  php_version: string
  php_sapi: string
  os: string
  memory_usage: string
  memory_peak: string
}

export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'error'
  status_code: number
  timestamp: string
  server_time: string
  duration_ms: number
  system: SystemInfo
  checks: {
    database: DatabaseCheck
    environment: EnvironmentCheck
  }
}

/**
 * Universal fetch wrapper that prepends the base URL from .env
 * and handles JSON parsing and error normalization.
 */
export async function apiFetch<T = ApiResponse>(
  path: string = '',
  options: RequestInit = {}
): Promise<T> {
  const url = getApiUrl(path)
  const headers = new Headers(options.headers || {})

  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }

  // Set Content-Type only if not sending FormData
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    })

    const text = await response.text()
    let data: Record<string, unknown>
    try {
      data = JSON.parse(text)
    } catch {
      data = {
        status: response.ok ? 'success' : 'error',
        message: text || `HTTP ${response.status} ${response.statusText}`,
      }
    }

    if (!response.ok) {
      const errorMessage =
        typeof data.message === 'string'
          ? data.message
          : `Request failed with status ${response.status}`
      throw new Error(errorMessage)
    }

    return data as T
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'TypeError' && err.message?.includes('Failed to fetch')) {
        throw new Error(
          `Unable to reach backend at "${url}". Please verify your backend server is running and VITE_API_URL in frontend/.env is correct.`
        )
      }
      throw err
    }
    throw new Error(String(err))
  }
}

/**
 * Query backend health endpoint.
 */
export async function checkBackendHealth(): Promise<HealthCheckResponse> {
  return apiFetch<HealthCheckResponse>('/health.php')
}

export default {
  baseUrl: API_BASE_URL,
  getUrl: getApiUrl,
  fetch: apiFetch,
  checkHealth: checkBackendHealth,
}
