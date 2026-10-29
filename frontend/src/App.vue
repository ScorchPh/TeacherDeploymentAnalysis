<script setup lang="ts">
import DesktopLayout from './components/DesktopLayout.vue'
</script>

<template>
  <DesktopLayout />
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
