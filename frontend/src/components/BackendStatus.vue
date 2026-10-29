<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { API_BASE_URL, checkBackendHealth, type HealthCheckResponse } from '../services/api'

const apiUrl = API_BASE_URL
const isLoading = ref(false)
const healthData = ref<HealthCheckResponse | null>(null)
const errorMessage = ref<string | null>(null)
const status = ref<'idle' | 'loading' | 'healthy' | 'degraded' | 'error'>('idle')

async function runHealthCheck() {
  isLoading.value = true
  errorMessage.value = null
  status.value = 'loading'

  try {
    const data = await checkBackendHealth()
    healthData.value = data
    if (data.status === 'ok') {
      status.value = 'healthy'
    } else if (data.status === 'degraded') {
      status.value = 'degraded'
    } else {
      status.value = 'error'
    }
  } catch (err: unknown) {
    errorMessage.value = err instanceof Error ? err.message : 'Health check failed'
    status.value = 'error'
    healthData.value = null
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  runHealthCheck()
})
</script>

<template>
  <div class="health-card">
    <div class="header">
      <div class="title-wrap">
        <span class="icon">🩺</span>
        <div class="title-text">
          <h3>System Health Check</h3>
          <span class="subtitle">Live Backend & Database Diagnostics</span>
        </div>
      </div>
      <div class="badge-wrap">
        <span :class="['badge', status]">
          <span class="dot"></span>
          {{
            status === 'loading'
              ? 'Checking Health...'
              : status === 'healthy'
                ? 'System Healthy'
                : status === 'degraded'
                  ? 'Degraded'
                  : status === 'error'
                    ? 'Service Down'
                    : 'Idle'
          }}
        </span>
      </div>
    </div>

    <!-- URL Config Section -->
    <div class="info-group">
      <div class="info-row">
        <span class="label">API Target (<code>VITE_API_URL</code>):</span>
        <code class="url-value">{{ apiUrl }}</code>
      </div>
      <span class="env-hint">
        Loaded from <code>frontend/.env</code>. Edit that file to target another environment.
      </span>
    </div>

    <!-- Healthy Diagnostics Grid -->
    <div v-if="healthData && (status === 'healthy' || status === 'degraded')" class="diagnostics-panel">
      <div class="metrics-grid">
        <!-- Database Card -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">🗄️</span>
            <span class="metric-title">Database</span>
            <span :class="['mini-badge', healthData.checks.database.status]">
              {{ healthData.checks.database.status.toUpperCase() }}
            </span>
          </div>
          <div class="metric-body">
            <div class="metric-row">
              <span class="metric-label">Name:</span>
              <strong class="highlight-val">{{ healthData.checks.database.database || 'N/A' }}</strong>
            </div>
            <div class="metric-row">
              <span class="metric-label">Host:</span>
              <span>{{ healthData.checks.database.host || 'localhost' }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Latency:</span>
              <span class="latency-tag">
                ⚡ {{ healthData.checks.database.latency_ms ?? 0 }} ms
              </span>
            </div>
          </div>
        </div>

        <!-- Environment Card -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">⚙️</span>
            <span class="metric-title">Configuration</span>
            <span :class="['mini-badge', healthData.checks.environment.status]">
              {{ healthData.checks.environment.status.toUpperCase() }}
            </span>
          </div>
          <div class="metric-body">
            <div class="metric-row">
              <span class="metric-label">Env File:</span>
              <span>{{ healthData.checks.environment.path }} (Loaded)</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">HTTP Status:</span>
              <span class="status-code">{{ healthData.status_code }} OK</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Total Time:</span>
              <span>{{ healthData.duration_ms }} ms</span>
            </div>
          </div>
        </div>

        <!-- Runtime Card -->
        <div class="metric-card">
          <div class="metric-header">
            <span class="metric-icon">🖥️</span>
            <span class="metric-title">PHP Runtime</span>
            <span class="mini-badge runtime">V{{ healthData.system.php_version.split('-')[0] }}</span>
          </div>
          <div class="metric-body">
            <div class="metric-row">
              <span class="metric-label">OS:</span>
              <span>{{ healthData.system.os }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Memory:</span>
              <span>{{ healthData.system.memory_usage }}</span>
            </div>
            <div class="metric-row">
              <span class="metric-label">Server Time:</span>
              <span class="timestamp-val">{{ healthData.server_time }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Error Diagnostics -->
    <div v-if="status === 'error'" class="error-panel">
      <div class="error-header">
        <span class="error-icon">⚠️</span>
        <strong>Health Check Failed</strong>
      </div>
      <p class="error-message">{{ errorMessage }}</p>
      <div class="error-guide">
        <span class="guide-title">Troubleshooting:</span>
        <ul>
          <li>Verify backend server is running: <code>php -S localhost:8000</code> in <code>backend/</code></li>
          <li>Check MySQL service is started (XAMPP / MySQL Service)</li>
          <li>Verify database credentials in <code>backend/.env</code></li>
        </ul>
      </div>
    </div>

    <!-- Actions -->
    <div class="footer-actions">
      <span v-if="healthData?.timestamp" class="last-checked">
        Last checked: {{ new Date(healthData.timestamp).toLocaleTimeString() }}
      </span>
      <button class="refresh-btn" :disabled="isLoading" @click="runHealthCheck">
        <span v-if="isLoading" class="spinner"></span>
        <span>{{ isLoading ? 'Checking...' : '🔄 Run Health Check' }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.health-card {
  margin: 1.5rem 0;
  padding: 1.5rem;
  background: var(--color-background-soft, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 14px;
  box-shadow: 0 4px 12px -2px rgba(0, 0, 0, 0.06);
  font-family: inherit;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.title-wrap {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.icon {
  font-size: 1.75rem;
}

.title-text h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-heading, #0f172a);
}

.subtitle {
  font-size: 0.85rem;
  color: var(--color-text, #64748b);
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.35rem 0.85rem;
  border-radius: 9999px;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s;
}

.badge.healthy {
  background: #dcfce7;
  color: #15803d;
}

.badge.degraded {
  background: #fef3c7;
  color: #b45309;
}

.badge.error {
  background: #fee2e2;
  color: #b91c1c;
}

.badge.loading {
  background: #e0e7ff;
  color: #4338ca;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: currentColor;
}

.info-group {
  background: var(--color-background-mute, #f8fafc);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.25rem;
}

.info-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  font-size: 0.9rem;
}

.label {
  color: var(--color-text, #475569);
}

.url-value {
  background: #e0e7ff;
  color: #3730a3;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
}

.env-hint {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.8rem;
  color: var(--color-text, #64748b);
}

.diagnostics-panel {
  margin: 1rem 0;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.metric-card {
  background: var(--color-background, #ffffff);
  border: 1px solid var(--color-border, #e2e8f0);
  border-radius: 10px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.metric-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border, #f1f5f9);
}

.metric-icon {
  font-size: 1.1rem;
}

.metric-title {
  font-weight: 600;
  font-size: 0.95rem;
  flex: 1;
  margin-left: 0.4rem;
  color: var(--color-heading, #1e293b);
}

.mini-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.mini-badge.up {
  background: #dcfce7;
  color: #166534;
}

.mini-badge.down {
  background: #fee2e2;
  color: #991b1b;
}

.mini-badge.runtime {
  background: #e0f2fe;
  color: #0369a1;
}

.metric-body {
  font-size: 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.metric-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.metric-label {
  color: var(--color-text, #64748b);
}

.highlight-val {
  color: #059669;
  font-weight: 700;
}

.latency-tag {
  background: #f0fdf4;
  color: #15803d;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.8rem;
}

.status-code {
  color: #15803d;
  font-weight: 600;
}

.timestamp-val {
  font-size: 0.8rem;
  color: var(--color-text, #64748b);
}

.error-panel {
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  padding: 1rem 1.25rem;
  margin: 1rem 0;
  color: #991b1b;
}

.error-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
  margin-bottom: 0.5rem;
}

.error-message {
  margin: 0.25rem 0 0.75rem 0;
  font-size: 0.9rem;
  word-break: break-word;
}

.error-guide {
  font-size: 0.85rem;
  border-top: 1px dashed #fca5a5;
  padding-top: 0.5rem;
}

.error-guide ul {
  margin: 0.4rem 0 0 1.2rem;
  padding: 0;
}

.footer-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 1.25rem;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.last-checked {
  font-size: 0.8rem;
  color: var(--color-text, #94a3b8);
}

.refresh-btn {
  background: #2563eb;
  color: #ffffff;
  border: none;
  padding: 0.55rem 1.25rem;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.refresh-btn:hover:not(:disabled) {
  background: #1d4ed8;
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinner {
  width: 14px;
  height: 14px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
