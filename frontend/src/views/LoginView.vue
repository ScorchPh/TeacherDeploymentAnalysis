<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { authStore } from '../stores/authStore'
import systemLogo from '../assets/logo.png'

const router = useRouter()
const route = useRoute()
const googleBtnRef = ref<HTMLDivElement | null>(null)
const isGoogleLoading = ref(false)
const loginNotice = ref('')
const showGoogleHelp = ref(false)
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : 'current domain'

// Google Client ID from backend .env / frontend env
const googleClientId = ref(
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  '656781339160-ubbav7amej5s7lf4299nqquqkig47r52.apps.googleusercontent.com'
)

onMounted(async () => {
  // If user is already authenticated, redirect to dashboard
  if (authStore.isAuthenticated) {
    router.replace('/dashboard')
    return
  }

  // Fetch client ID configured in backend .env if available
  try {
    const candidates = ['/backend/api.php', '/api.php', 'http://localhost:8000/api.php']
    for (const url of candidates) {
      try {
        const res = await fetch(`${url}?action=get_config`)
        if (res.ok) {
          const cfg = await res.json()
          if (cfg.google_client_id) {
            googleClientId.value = cfg.google_client_id.trim()
            break
          }
        }
      } catch {}
    }
  } catch {}

  // Initialize Google Identity Services
  initGoogleAuth()
})

function initGoogleAuth() {
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
    try {
      ;(window as any).google.accounts.id.initialize({
        client_id: googleClientId.value,
        callback: handleGoogleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      })

      if (googleBtnRef.value) {
        ;(window as any).google.accounts.id.renderButton(googleBtnRef.value, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
        })
      }
    } catch (e) {
      console.warn('Google Identity Services init notice:', e)
    }
  }
}

async function handleGoogleCredentialResponse(response: any) {
  if (response?.credential) {
    isGoogleLoading.value = true
    const result = await authStore.loginWithGoogleToken(response.credential)
    isGoogleLoading.value = false
    if (result.ok) {
      const target = (route.query.redirect as string) || '/dashboard'
      router.push(target)
    } else {
      loginNotice.value = result.error || 'Google login failed.'
    }
  }
}

function handleCustomGoogleClick() {
  if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
    try {
      ;(window as any).google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          showGoogleHelp.value = true
        }
      })
    } catch {
      showGoogleHelp.value = true
    }
  } else {
    showGoogleHelp.value = true
  }
}
</script>

<template>
  <div class="login-wrapper">
    <div class="login-backdrop-glow"></div>

    <div class="login-card">
      <!-- System Header -->
      <div class="login-header">
        <div class="logo-wrapper">
          <img :src="systemLogo" alt="DepEd TNA Logo" class="login-logo" />
        </div>
        <h1 class="system-title">DepEd TNA</h1>
        <p class="system-subtitle">Teacher Needs Analysis & Deployment System</p>
        <div class="division-pill">Division of Lapu-Lapu City</div>
      </div>

      <!-- Auth Section -->
      <div class="login-body">
        <div v-if="loginNotice" class="alert-box alert-error">
          <span>⚠️ {{ loginNotice }}</span>
          <button class="alert-close" @click="loginNotice = ''">✕</button>
        </div>

        <!-- Google Login Section -->
        <div class="auth-section">
          <label class="section-label">Institutional Single Sign-On</label>

          <!-- Native Google GIS Button Container -->
          <div ref="googleBtnRef" class="google-gis-container"></div>

          <!-- Custom Branded Google Button Fallback -->
          <button
            class="google-custom-btn"
            :disabled="isGoogleLoading"
            @click="handleCustomGoogleClick"
          >
            <svg class="google-icon" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>{{ isGoogleLoading ? 'Signing in with Google...' : 'Continue with Google Workspace' }}</span>
          </button>
        </div>

        <!-- Google Setup Info Modal / Banner -->
        <div v-if="showGoogleHelp" class="google-help-box">
          <div class="help-header">
            <strong>ℹ️ Google OAuth Configuration</strong>
            <button class="help-close" @click="showGoogleHelp = false">✕</button>
          </div>
          <p class="help-text">
            Google OAuth Client ID is registered. Ensure your current web origin
            (<code>{{ currentOrigin }}</code>) is added to
            <strong>Authorized JavaScript origins</strong> in your Google Cloud Console.
          </p>
          <p class="help-sub">Only personnel authorized in Staff Management can access this system.</p>
        </div>
      </div>

      <!-- Footer Info -->
      <div class="login-footer">
        <span>DepEd Lapu-Lapu City • TNA System v1.7.0</span>
        <span class="secure-tag">🔒 Google SSO Secured</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 50% 20%, #1e3a8a 0%, #0f172a 75%, #020617 100%);
  padding: 1.25rem;
  overflow-y: auto;
  box-sizing: border-box;
}

.login-backdrop-glow {
  position: absolute;
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.25) 0%, rgba(37, 99, 235, 0) 70%);
  pointer-events: none;
  filter: blur(40px);
}

.login-card {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 440px;
  background: #ffffff;
  border-radius: 18px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: cardFadeIn 0.3s ease-out;
}

@keyframes cardFadeIn {
  from {
    opacity: 0;
    transform: translateY(12px) scale(0.98);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.login-header {
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  padding: 2rem 1.5rem 1.5rem;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
}

.logo-wrapper {
  display: inline-flex;
  padding: 6px;
  background: #ffffff;
  border-radius: 50%;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.12);
  margin-bottom: 0.85rem;
}

.login-logo {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  object-fit: contain;
}

.system-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: #0f172a;
  letter-spacing: -0.02em;
  margin: 0;
}

.system-subtitle {
  font-size: 0.82rem;
  color: #475569;
  margin: 0.35rem 0 0.75rem;
}

.division-pill {
  display: inline-block;
  background: #0038a8;
  color: #ffffff;
  font-size: 0.72rem;
  font-weight: 700;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.login-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.alert-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  font-size: 0.82rem;
}

.alert-error {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.alert-close {
  background: transparent;
  border: none;
  cursor: pointer;
  color: #991b1b;
  font-size: 0.85rem;
}

.section-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  color: #64748b;
  letter-spacing: 0.05em;
  margin-bottom: 0.5rem;
}

.auth-section {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.google-gis-container {
  display: flex;
  justify-content: center;
}

.google-custom-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  border-radius: 10px;
  color: #1e293b;
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.google-custom-btn:hover {
  background: #f8fafc;
  border-color: #94a3b8;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.google-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.google-help-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 10px;
  padding: 0.85rem;
  font-size: 0.78rem;
  color: #1e3a8a;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.help-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.help-close {
  background: transparent;
  border: none;
  font-size: 0.85rem;
  color: #1e3a8a;
  cursor: pointer;
}

.help-text code {
  background: #dbeafe;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-weight: 600;
}

.help-sub {
  color: #3b82f6;
  font-weight: 500;
}

.divider {
  display: flex;
  align-items: center;
  text-align: center;
  margin: 0.25rem 0;
}

.divider::before,
.divider::after {
  content: '';
  flex: 1;
  border-bottom: 1px solid #e2e8f0;
}

.divider span {
  padding: 0 0.75rem;
  font-size: 0.68rem;
  font-weight: 700;
  color: #94a3b8;
  letter-spacing: 0.08em;
}

.mock-login-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.btn-mock {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  text-align: left;
}

.btn-admin {
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
}

.btn-admin:hover {
  background: #eff6ff;
  border-color: #3b82f6;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.12);
  transform: translateY(-1px);
}

.btn-staff {
  background: #f8fafc;
  border: 1.5px solid #cbd5e1;
}

.btn-staff:hover {
  background: #f0fdf4;
  border-color: #22c55e;
  box-shadow: 0 4px 12px rgba(34, 197, 94, 0.12);
  transform: translateY(-1px);
}

.mock-icon {
  font-size: 1.4rem;
  line-height: 1;
}

.mock-btn-text {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.mock-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: #0f172a;
}

.mock-desc {
  font-size: 0.72rem;
  color: #64748b;
  margin-top: 0.15rem;
}

.role-chip {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  text-transform: uppercase;
}

.chip-admin {
  background: #fee2e2;
  color: #991b1b;
}

.chip-staff {
  background: #dcfce7;
  color: #166534;
}

.login-footer {
  padding: 0.85rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;
  color: #64748b;
}

.secure-tag {
  color: #059669;
  font-weight: 600;
}

@media (max-width: 480px) {
  .login-card {
    border-radius: 14px;
  }
  .login-header {
    padding: 1.5rem 1rem 1.25rem;
  }
  .login-body {
    padding: 1.15rem;
  }
  .system-title {
    font-size: 1.3rem;
  }
}
</style>
