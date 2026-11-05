import { createRouter, createWebHistory, createWebHashHistory } from 'vue-router'
import { authStore } from '../stores/authStore'
import DashboardView from '../views/DashboardView.vue'
import EsView from '../views/EsView.vue'
import JhsView from '../views/JhsView.vue'
import ShsView from '../views/ShsView.vue'
import LoginView from '../views/LoginView.vue'
import StaffView from '../views/StaffView.vue'

const isFileProtocol = typeof window !== 'undefined' && window.location.protocol === 'file:'

const router = createRouter({
  history: isFileProtocol
    ? createWebHashHistory()
    : createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      meta: { requiresAuth: true },
    },
    {
      path: '/es',
      name: 'es-analysis',
      component: EsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/jhs',
      name: 'jhs-analysis',
      component: JhsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/shs',
      name: 'shs-analysis',
      component: ShsView,
      meta: { requiresAuth: true },
    },
    {
      path: '/staff',
      name: 'staff-management',
      component: StaffView,
      meta: { requiresAuth: true, requiresAdmin: true },
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard',
    },
  ],
})

router.beforeEach((to, from, next) => {
  const isAuth = authStore.isAuthenticated
  const isAdmin = authStore.isAdmin

  // If page requires authentication and user is not logged in, force to login
  if (to.meta.requiresAuth && !isAuth) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  // If page requires Admin privileges and user is not Admin, redirect to dashboard
  if (to.meta.requiresAdmin && !isAdmin) {
    next({ name: 'dashboard' })
    return
  }

  // If already authenticated and trying to visit login page, redirect to dashboard
  if (to.name === 'login' && isAuth) {
    next({ name: 'dashboard' })
    return
  }

  next()
})

export default router
