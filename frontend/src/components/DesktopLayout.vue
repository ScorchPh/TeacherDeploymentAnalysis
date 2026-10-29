<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { tnaStore } from '../stores/tnaStore'

const route = useRoute()
const router = useRouter()

const navItems = [
  {
    name: 'Dashboard',
    path: '/dashboard',
    icon: '📊',
    desc: 'Overview & Analytics',
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

const currentTitle = computed(() => {
  const item = navItems.find((n) => n.path === route.path)
  return item ? item.name : 'Teacher Needs Analysis'
})

const currentDesc = computed(() => {
  const item = navItems.find((n) => n.path === route.path)
  return item ? item.desc : 'Staff Management Portal'
})
</script>

<template>
  <div class="desktop-container">
    <!-- Left Sidebar -->
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand-badge">
          <span class="brand-icon">🏛️</span>
          <div class="brand-text">
            <span class="brand-title">DepEd TNA</span>
            <span class="brand-subtitle">Staff Needs & Transfers</span>
          </div>
        </div>
      </div>

      <div class="nav-section-title">MAIN NAVIGATION</div>

      <nav class="sidebar-nav">
        <button
          v-for="item in navItems"
          :key="item.path"
          class="nav-link"
          :class="{ active: route.path === item.path }"
          @click="router.push(item.path)"
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

      <div class="sidebar-footer">
        <div class="staff-card">
          <div class="staff-avatar">SO</div>
          <div class="staff-info">
            <div class="staff-name">Staff Officer</div>
            <div class="staff-role">DepEd Division Office</div>
          </div>
        </div>
        <div class="app-version">Version 1.0.0 • Desktop Staff Client</div>
      </div>
    </aside>

    <!-- Main Content Area -->
    <div class="main-wrapper">
      <!-- Top Navbar -->
      <header class="top-navbar">
        <div class="navbar-left">
          <h1 class="page-title">{{ currentTitle }}</h1>
          <span class="page-tag">{{ currentDesc }}</span>
        </div>

        <div class="navbar-right">
          <div class="sy-badge">
            <span class="dot-live"></span>
            <span>School Year: <strong>2025–2026</strong></span>
          </div>

          <div class="status-chip">
            <span>Formula: </span>
            <code>Needs = (GAP + T-Out) - T-In</code>
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
}

.sidebar-header {
  padding: 1.25rem 1.25rem 1rem;
  border-bottom: 1px solid #1e293b;
}

.brand-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.brand-icon {
  font-size: 1.75rem;
  background: rgba(255, 255, 255, 0.08);
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  border: 1px solid rgba(255, 255, 255, 0.1);
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
  font-size: 0.75rem;
}

.nav-section-title {
  font-size: 0.68rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.08em;
  padding: 1.25rem 1.25rem 0.5rem;
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
  padding: 0.75rem 0.85rem;
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
  font-size: 1.3rem;
  line-height: 1;
}

.nav-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.nav-label {
  font-size: 0.9rem;
  font-weight: 600;
}

.nav-sub {
  font-size: 0.72rem;
  opacity: 0.75;
}

.nav-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.5rem;
  border-radius: 9999px;
  background-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid #1e293b;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.staff-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.6rem 0.75rem;
  background: rgba(255, 255, 255, 0.04);
  border-radius: var(--radius-sm);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  font-weight: 700;
}

.staff-info {
  display: flex;
  flex-direction: column;
}

.staff-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: #f1f5f9;
}

.staff-role {
  font-size: 0.7rem;
  color: #94a3b8;
}

.app-version {
  font-size: 0.65rem;
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
  height: 64px;
  background-color: var(--color-navbar-bg);
  border-bottom: 1px solid var(--color-navbar-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.75rem;
  flex-shrink: 0;
  z-index: 10;
  box-shadow: var(--shadow-sm);
}

.navbar-left {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
}

.page-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text-main);
  letter-spacing: -0.01em;
}

.page-tag {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.navbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sy-badge {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  color: var(--color-text-main);
  background: #f1f5f9;
  padding: 0.4rem 0.85rem;
  border-radius: 9999px;
  border: 1px solid var(--color-border);
}

.dot-live {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #10b981;
  box-shadow: 0 0 0 2px rgba(16, 185, 129, 0.2);
}

.status-chip {
  font-size: 0.75rem;
  background-color: #f8fafc;
  border: 1px solid var(--color-border-dark);
  padding: 0.35rem 0.75rem;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
}

.status-chip code {
  color: #2563eb;
  font-weight: 600;
}

/* Page Content Viewport */
.page-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem;
  background-color: var(--color-bg);
}
</style>
