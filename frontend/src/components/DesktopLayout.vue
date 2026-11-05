<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tnaStore } from '../stores/tnaStore'
import { authStore } from '../stores/authStore'
import systemLogo from '../assets/logo.png'

const route = useRoute()
const router = useRouter()
const isSidebarHidden = ref(false)
const isMobile = ref(false)

function checkMobile() {
  if (typeof window !== 'undefined') {
    isMobile.value = window.innerWidth <= 768
    if (isMobile.value) {
      isSidebarHidden.value = true
    }
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})

function navigateTo(path: string) {
  router.push(path)
  if (isMobile.value) {
    isSidebarHidden.value = true
  }
}

function handleLogout() {
  if (confirm('Are you sure you want to log out of DepEd TNA?')) {
    authStore.logout()
    router.push('/login')
  }
}

const currentUser = computed(() => authStore.user)
const userRole = computed(() => authStore.user?.role || 'Staff Officer')
const userInitials = computed(() => {
  const name = authStore.user?.name || 'Staff Officer'
  const parts = name.trim().split(/\s+/)
  const first = parts[0]?.charAt(0) || 'S'
  const second = parts[1]?.charAt(0) || parts[0]?.charAt(1) || 'O'
  return (first + second).toUpperCase()
})

const schoolYearOptions = computed(() => {
  const presets = [
    '2023–2024',
    '2024–2025',
    '2025–2026',
    '2026–2027',
    '2027–2028',
    '2028–2029',
    '2029–2030',
    '2030–2031',
    '2031–2032',
  ]
  const current = (tnaStore.schoolYear || '2025–2026').replace('-', '–')
  if (!presets.includes(current) && !presets.includes(tnaStore.schoolYear)) {
    return [tnaStore.schoolYear, ...presets]
  }
  return presets
})

const navItems = computed(() => {
  const items = [
    {
      name: 'Dashboard',
      path: '/dashboard',
      icon: '📊',
      desc: 'Overview & Analytics',
      badge: null as any,
    },
    {
      name: 'ES Analysis',
      path: '/es',
      icon: '🏫',
      desc: 'Elementary School Needs',
      badge: computed(() => tnaStore.esRecords.length),
    },
    {
      name: 'JHS Analysis',
      path: '/jhs',
      icon: '📘',
      desc: 'Junior High School Needs',
      badge: computed(() => tnaStore.jhsRecords.length),
    },
    {
      name: 'SHS Analysis',
      path: '/shs',
      icon: '🎓',
      desc: 'Senior High School Needs',
      badge: computed(() => tnaStore.shsRecords.length),
    },
  ]

  if (authStore.isAdmin) {
    items.push({
      name: 'Staff Management',
      path: '/staff',
      icon: '👥',
      desc: 'Authorized Staff & Roles',
      badge: null as any,
    })
  }

  return items
})

const currentTitle = computed(() => {
  const item = navItems.value.find((n) => n.path === route.path)
  return item ? item.name : 'Teacher Needs Analysis'
})

const currentDesc = computed(() => {
  const item = navItems.value.find((n) => n.path === route.path)
  return item ? item.desc : 'Staff Management Portal'
})
</script>

<template>
  <div class="desktop-container">
    <!-- Mobile Backdrop -->
    <div
      v-if="!isSidebarHidden && isMobile"
      class="sidebar-backdrop"
      @click="isSidebarHidden = true"
    ></div>

    <!-- Left Sidebar / Mobile Drawer -->
    <aside class="sidebar" :class="{ 'sidebar-hidden': isSidebarHidden }">
      <div class="sidebar-header">
        <div class="brand-badge">
          <img :src="systemLogo" alt="DepEd TNA Logo" class="brand-logo-img" />
          <div class="brand-text">
            <span class="brand-title">DepEd TNA</span>
            <span class="brand-subtitle">Teacher Needs Analysis</span>
          </div>
        </div>
        <button
          class="sidebar-close-btn"
          title="Close Sidebar"
          @click="isSidebarHidden = true"
        >
          ✕
        </button>
      </div>

      <div class="nav-section-title">MAIN NAVIGATION</div>

      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-link"
          :class="{ active: route.path === item.path }"
          @click="navigateTo(item.path)"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <div class="nav-content">
            <span class="nav-label">{{ item.name }}</span>
            <span class="nav-sub">{{ item.desc }}</span>
          </div>
          <span v-if="item.badge && item.badge.value" class="nav-badge">
            {{ item.badge.value }}
          </span>
        </button>
      </nav>

      <!-- Sidebar User Profile & Logout -->
      <div class="sidebar-footer">
        <div class="staff-card">
          <div v-if="currentUser?.avatar" class="staff-avatar-img-wrap">
            <img :src="currentUser.avatar" alt="User Avatar" class="staff-avatar-img" />
          </div>
          <div v-else class="staff-avatar">
            {{ userInitials }}
          </div>
          <div class="staff-info">
            <div class="staff-name">{{ currentUser?.name || 'Authorized User' }}</div>
            <div class="staff-role-wrap">
              <span class="staff-role-badge" :class="userRole === 'Admin' ? 'role-admin' : 'role-staff'">
                {{ userRole }}
              </span>
              <span class="staff-email-txt">{{ currentUser?.email || 'depedlapulapu.net.ph' }}</span>
            </div>
          </div>
        </div>

        <button class="logout-btn" title="Sign out of system" @click="handleLogout">
          <span class="logout-icon">🚪</span>
          <span>Sign Out</span>
        </button>

        <div class="app-version">
          <span>DepEd Lapu-Lapu City • TNA v1.7.0</span>
        </div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="main-wrapper">
      <!-- Top Navbar -->
      <header class="top-navbar">
        <div class="navbar-left">
          <button
            class="sidebar-toggle-btn"
            :title="isSidebarHidden ? 'Show Sidebar' : 'Hide Sidebar'"
            @click="isSidebarHidden = !isSidebarHidden"
          >
            <span class="toggle-icon">{{ isSidebarHidden ? '☰' : '⇤' }}</span>
            <span class="toggle-text">{{ isSidebarHidden ? 'Menu' : 'Hide' }}</span>
          </button>
          <img
            v-if="isSidebarHidden"
            :src="systemLogo"
            alt="DepEd TNA Logo"
            class="navbar-logo-img"
          />
          <div class="navbar-title-wrap">
            <h1 class="page-title">{{ currentTitle }}</h1>
            <span class="page-tag">{{ currentDesc }}</span>
          </div>
        </div>

        <div class="navbar-right">
          <!-- Indicators legend (hidden on mobile) -->
          <div class="indicator-legend hide-on-mobile">
            <span class="legend-item legend-needs">🔴 +Needs</span>
            <span class="legend-item legend-excess">🔵 -Excess</span>
            <span class="legend-item legend-balanced">🟢 0 Balanced</span>
          </div>

          <!-- School Year Dropdown -->
          <label class="sy-badge" title="Select School Year">
            <span class="dot-live"></span>
            <span class="sy-label-txt hide-on-mobile">SY:</span>
            <select v-model="tnaStore.schoolYear" class="sy-select">
              <option v-for="sy in schoolYearOptions" :key="sy" :value="sy">
                {{ sy }}
              </option>
            </select>
          </label>

          <!-- Quick User Avatar & Logout on Navbar -->
          <div class="nav-user-chip" :title="`Logged in as ${currentUser?.name || 'User'} (${userRole})`">
            <div class="user-chip-avatar">
              {{ userInitials }}
            </div>
            <button class="nav-logout-btn" title="Sign Out" @click="handleLogout">
              ✕
            </button>
          </div>
        </div>
      </header>

      <!-- View Content Slot -->
      <main class="page-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<style scoped>
.desktop-container {
  display: flex;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background-color: var(--color-bg);
  position: relative;
}

/* Sidebar Backdrop on Mobile */
.sidebar-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(3px);
  z-index: 990;
  animation: backdropFade 0.2s ease-out;
}

@keyframes backdropFade {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Sidebar Styles */
.sidebar {
  width: 275px;
  background-color: var(--color-sidebar-bg);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  border-right: 1px solid #1e293b;
  user-select: none;
  transition: width 0.22s ease, opacity 0.18s ease, transform 0.22s ease;
  overflow: hidden;
  white-space: nowrap;
  z-index: 1000;
}

.sidebar.sidebar-hidden {
  width: 0;
  border-right: none;
  opacity: 0;
  pointer-events: none;
}

.sidebar-header {
  padding: 1.15rem 1.15rem 1rem;
  border-bottom: 1px solid #1e293b;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.sidebar-close-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #cbd5e1;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  transition: all 0.15s ease;
}

.sidebar-close-btn:hover {
  background: rgba(255, 255, 255, 0.18);
  color: #ffffff;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-logo-img {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: contain;
  background: #ffffff;
  padding: 1px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
  flex-shrink: 0;
}

.navbar-logo-img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: contain;
  flex-shrink: 0;
}

.brand-text {
  display: flex;
  flex-direction: column;
}

.brand-title {
  color: #ffffff;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.brand-subtitle {
  color: #94a3b8;
  font-size: 0.72rem;
}

.nav-section-title {
  font-size: 0.65rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.08em;
  padding: 1.15rem 1.15rem 0.45rem;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0 0.85rem;
  flex: 1;
  overflow-y: auto;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  width: 100%;
  padding: 0.7rem 0.85rem;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  color: var(--color-sidebar-text);
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease-in-out;
}

.nav-link:hover {
  background-color: var(--color-sidebar-hover);
  color: #f8fafc;
}

.nav-link.active {
  background-color: var(--color-sidebar-active);
  color: var(--color-sidebar-text-active);
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.35);
}

.nav-icon {
  font-size: 1.25rem;
  line-height: 1;
}

.nav-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.nav-label {
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-sub {
  font-size: 0.7rem;
  opacity: 0.75;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nav-badge {
  font-size: 0.68rem;
  font-weight: 700;
  padding: 0.12rem 0.45rem;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

/* Sidebar Footer & User Profile */
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.staff-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.55rem 0.7rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.staff-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #2563eb;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: 800;
  flex-shrink: 0;
}

.staff-avatar-img-wrap {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  overflow: hidden;
  flex-shrink: 0;
}

.staff-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.staff-info {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
}

.staff-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: #f1f5f9;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.staff-role-wrap {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.1rem;
}

.staff-role-badge {
  font-size: 0.6rem;
  font-weight: 800;
  padding: 0.08rem 0.35rem;
  border-radius: 4px;
  text-transform: uppercase;
}

.role-admin {
  background: #fee2e2;
  color: #991b1b;
}

.role-staff {
  background: #dbeafe;
  color: #1e40af;
}

.staff-email-txt {
  font-size: 0.66rem;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  width: 100%;
  padding: 0.45rem 0.75rem;
  background: rgba(239, 68, 68, 0.12);
  border: 1px solid rgba(239, 68, 68, 0.25);
  border-radius: var(--radius-sm);
  color: #fca5a5;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
}

.logout-btn:hover {
  background: #dc2626;
  color: #ffffff;
  border-color: #dc2626;
}

.app-version {
  font-size: 0.62rem;
  color: #64748b;
  text-align: center;
}

/* Main Wrapper & Top Navbar */
.main-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  height: 100vh;
}

.top-navbar {
  min-height: 58px;
  background-color: var(--color-navbar-bg);
  border-bottom: 1px solid var(--color-navbar-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1.25rem;
  flex-shrink: 0;
  z-index: 10;
  box-shadow: var(--shadow-sm);
  gap: 0.75rem;
}

.navbar-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  flex-shrink: 1;
  overflow: hidden;
}

.navbar-title-wrap {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-toggle-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  border: 1px solid #cbd5e1;
  background: #f8fafc;
  color: #1e293b;
  font-size: 0.78rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  flex-shrink: 0;
}

.sidebar-toggle-btn:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
}

.toggle-icon {
  font-size: 0.9rem;
  line-height: 1;
}

.page-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-main);
  letter-spacing: -0.01em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.page-tag {
  font-size: 0.72rem;
  color: var(--color-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
}

.indicator-legend {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.legend-item {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
}

.legend-needs {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #f87171;
}

.legend-excess {
  background: #e0f2fe;
  color: #075985;
  border: 1px solid #38bdf8;
}

.legend-balanced {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #4ade80;
}

.db-status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  font-weight: 700;
  padding: 0.25rem 0.55rem;
  border-radius: 9999px;
  cursor: pointer;
  transition: all 0.15s ease;
  user-select: none;
}

.db-status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.db-status-connected {
  background: #ecfdf5;
  color: #065f46;
  border: 1px solid #6ee7b7;
}

.db-status-connected .db-status-dot {
  background: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.25);
}

.db-status-connecting {
  background: #fefce8;
  color: #854d0e;
  border: 1px solid #fde047;
}

.db-status-connecting .db-status-dot {
  background: #eab308;
}

.db-status-offline,
.db-status-error {
  background: #fef2f2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.db-status-offline .db-status-dot,
.db-status-error .db-status-dot {
  background: #ef4444;
}

.sy-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.78rem;
  color: var(--color-text-main);
  background: #f1f5f9;
  padding: 0.25rem 0.6rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
  cursor: pointer;
  transition: all 0.15s ease;
}

.sy-badge:hover {
  background: #e2e8f0;
  border-color: #94a3b8;
}

.sy-label-txt {
  white-space: nowrap;
  color: #475569;
  font-weight: 600;
}

.sy-select {
  border: none;
  background: transparent;
  font-size: 0.78rem;
  font-weight: 700;
  color: #0f172a;
  cursor: pointer;
  outline: none;
  padding-right: 0.1rem;
}

.dot-live {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.nav-user-chip {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  background: #f1f5f9;
  padding: 0.2rem 0.4rem 0.2rem 0.25rem;
  border-radius: 999px;
  border: 1px solid #cbd5e1;
}

.user-chip-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #0038a8;
  color: #ffffff;
  font-size: 0.68rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-logout-btn {
  background: transparent;
  border: none;
  font-size: 0.75rem;
  color: #64748b;
  cursor: pointer;
  padding: 0.1rem 0.2rem;
  line-height: 1;
}

.nav-logout-btn:hover {
  color: #dc2626;
}

/* Page Content Viewport */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.25rem 1.5rem;
  background-color: var(--color-bg);
  -webkit-overflow-scrolling: touch;
}

/* -------------------------------------------------------------------------
   Mobile Responsive Adjustments (< 768px)
------------------------------------------------------------------------- */
@media (max-width: 768px) {
  .sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    width: 280px !important;
    transform: translateX(0);
    box-shadow: 4px 0 24px rgba(0, 0, 0, 0.45);
    z-index: 1000;
  }

  .sidebar.sidebar-hidden {
    transform: translateX(-100%);
    width: 280px !important;
    opacity: 0;
    pointer-events: none;
  }

  .top-navbar {
    padding: 0.4rem 0.75rem;
  }

  .hide-on-mobile {
    display: none !important;
  }

  .page-title {
    font-size: 0.95rem;
  }

  .page-tag {
    display: none;
  }

  .page-content {
    padding: 0.75rem 0.65rem;
  }
}
</style>
