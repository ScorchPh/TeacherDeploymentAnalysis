import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from '../views/DashboardView.vue'
import EsView from '../views/EsView.vue'
import JhsView from '../views/JhsView.vue'
import ShsView from '../views/ShsView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/dashboard',
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
    },
    {
      path: '/es',
      name: 'es-analysis',
      component: EsView,
    },
    {
      path: '/jhs',
      name: 'jhs-analysis',
      component: JhsView,
    },
    {
      path: '/shs',
      name: 'shs-analysis',
      component: ShsView,
    },
  ],
})

export default router
