import { reactive, computed } from 'vue'

export interface AuthUser {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Staff Officer'
  avatar?: string
  provider: 'mock' | 'google'
}

export interface AuthorizedStaff {
  id: number
  email: string
  name: string
  role: 'Admin' | 'Staff Officer'
  avatar?: string | null
  createdAt?: string
  updatedAt?: string
}

const AUTH_STORAGE_KEY = 'tna_auth_user_v1'

function getInitialUser(): AuthUser | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY) || localStorage.getItem(AUTH_STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse auth user:', e)
  }
  return null
}

function getApiCandidates(): string[] {
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  if (isLocal) {
    return ['http://localhost:8000/api.php', '/backend/api.php', '/api.php']
  }
  return ['/backend/api.php', '/api.php']
}

const state = reactive({
  user: getInitialUser() as AuthUser | null,
  isLoading: false,
  error: '',
  staffList: [] as AuthorizedStaff[],
  isLoadingStaff: false,
})

export const authStore = {
  state,

  get user(): AuthUser | null {
    return state.user
  },

  get isAuthenticated(): boolean {
    return Boolean(state.user)
  },

  get isAdmin(): boolean {
    return state.user?.role === 'Admin'
  },

  get staffList(): AuthorizedStaff[] {
    return state.staffList
  },

  setUser(user: AuthUser, remember = true) {
    state.user = user
    state.error = ''
    try {
      const serialized = JSON.stringify(user)
      if (remember) {
        localStorage.setItem(AUTH_STORAGE_KEY, serialized)
      }
      sessionStorage.setItem(AUTH_STORAGE_KEY, serialized)
    } catch (e) {
      console.error(e)
    }
  },

  async loginWithGoogleToken(credentialJwt: string) {
    state.isLoading = true
    state.error = ''
    try {
      const candidates = getApiCandidates()
      let lastErrMsg = 'Unable to reach backend authentication service.'

      for (const url of candidates) {
        try {
          const res = await fetch(`${url}?action=login_google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ credential: credentialJwt }),
          })
          const json = await res.json()
          if (res.ok && json.status === 'success' && json.user) {
            const googleUser: AuthUser = {
              id: String(json.user.id),
              name: json.user.name,
              email: json.user.email,
              role: json.user.role === 'Admin' ? 'Admin' : 'Staff Officer',
              avatar: json.user.avatar || '',
              provider: 'google',
            }
            this.setUser(googleUser, true)
            return { ok: true, user: googleUser }
          } else if (json.message) {
            lastErrMsg = json.message
          }
        } catch {
          // Try next endpoint
        }
      }

      state.error = lastErrMsg
      return { ok: false, error: lastErrMsg }
    } catch (err: any) {
      state.error = err.message || 'Google login failed'
      return { ok: false, error: state.error }
    } finally {
      state.isLoading = false
    }
  },

  async fetchStaffList(): Promise<AuthorizedStaff[]> {
    state.isLoadingStaff = true
    const candidates = getApiCandidates()
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?action=get_staff`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        })
        if (!res.ok) continue
        const json = await res.json()
        if (json.status === 'success' && Array.isArray(json.staff)) {
          state.staffList = json.staff
          state.isLoadingStaff = false
          return json.staff
        }
      } catch {
        // try next
      }
    }
    state.isLoadingStaff = false
    return state.staffList
  },

  async addStaff(payload: { name: string; email: string; role: 'Admin' | 'Staff Officer' }): Promise<{ ok: boolean; message: string }> {
    const candidates = getApiCandidates()
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?action=add_staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (res.ok && json.status === 'success') {
          await this.fetchStaffList()
          return { ok: true, message: json.message || 'Staff member authorized.' }
        } else if (json.message) {
          return { ok: false, message: json.message }
        }
      } catch {
        // try next
      }
    }
    return { ok: false, message: 'Server unreachable.' }
  },

  async updateStaff(payload: { id: number; name: string; role: 'Admin' | 'Staff Officer' }): Promise<{ ok: boolean; message: string }> {
    const candidates = getApiCandidates()
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?action=update_staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        if (res.ok && json.status === 'success') {
          await this.fetchStaffList()
          return { ok: true, message: json.message || 'Staff updated.' }
        } else if (json.message) {
          return { ok: false, message: json.message }
        }
      } catch {
        // try next
      }
    }
    return { ok: false, message: 'Server unreachable.' }
  },

  async deleteStaff(id: number): Promise<{ ok: boolean; message: string }> {
    const candidates = getApiCandidates()
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?action=delete_staff`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id }),
        })
        const json = await res.json()
        if (res.ok && json.status === 'success') {
          await this.fetchStaffList()
          return { ok: true, message: json.message || 'Staff access revoked.' }
        } else if (json.message) {
          return { ok: false, message: json.message }
        }
      } catch {
        // try next
      }
    }
    return { ok: false, message: 'Server unreachable.' }
  },

  logout() {
    state.user = null
    state.error = ''
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY)
      sessionStorage.removeItem(AUTH_STORAGE_KEY)
    } catch (e) {
      console.error(e)
    }
  },
}

