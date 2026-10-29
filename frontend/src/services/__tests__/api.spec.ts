import { describe, it, expect } from 'vitest'
import { API_BASE_URL, getApiUrl } from '../api'

describe('API service config', () => {
  it('reads API_BASE_URL properly', () => {
    expect(API_BASE_URL).toBeDefined()
    expect(API_BASE_URL.endsWith('/')).toBe(false)
  })

  it('formats getApiUrl paths correctly without double slashes', () => {
    expect(getApiUrl('api.php')).toBe(`${API_BASE_URL}/api.php`)
    expect(getApiUrl('/api.php')).toBe(`${API_BASE_URL}/api.php`)
    expect(getApiUrl('health.php')).toBe(`${API_BASE_URL}/health.php`)
    expect(getApiUrl('/health.php')).toBe(`${API_BASE_URL}/health.php`)
    expect(getApiUrl('')).toBe(API_BASE_URL)
  })
})
