<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import DesktopLayout from './components/DesktopLayout.vue'

const route = useRoute()
const isLoginPage = computed(() => route.name === 'login' || route.path === '/login' || route.path.startsWith('/login/'))
</script>

<template>
  <!-- Isolated, full-screen standalone login page (No sidebar, no navbar) -->
  <RouterView v-if="isLoginPage" />

  <!-- Authenticated application layout with sidebar & top navbar -->
  <DesktopLayout v-else />
</template>

<style>
/* Global resets for full-screen desktop layout */
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  padding: 0;
  overflow: hidden;
}
</style>
