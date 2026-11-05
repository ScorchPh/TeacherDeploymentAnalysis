<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { authStore, type AuthorizedStaff } from '../stores/authStore'

const searchQuery = ref('')
const selectedRoleFilter = ref<'ALL' | 'Admin' | 'Staff Officer'>('ALL')
const isModalOpen = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const modalLoading = ref(false)
const modalError = ref('')
const modalSuccess = ref('')

const formStaffId = ref<number | null>(null)
const formName = ref('')
const formEmail = ref('')
const formRole = ref<'Admin' | 'Staff Officer'>('Staff Officer')

onMounted(async () => {
  await authStore.fetchStaffList()
})

const staffList = computed(() => authStore.staffList)

const filteredStaff = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return staffList.value.filter((s) => {
    const matchesRole =
      selectedRoleFilter.value === 'ALL' || s.role === selectedRoleFilter.value
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q)
    return matchesRole && matchesSearch
  })
})

const adminCount = computed(
  () => staffList.value.filter((s) => s.role === 'Admin').length
)
const staffOfficerCount = computed(
  () => staffList.value.filter((s) => s.role === 'Staff Officer').length
)

function openAddModal() {
  modalMode.value = 'add'
  formStaffId.value = null
  formName.value = ''
  formEmail.value = ''
  formRole.value = 'Staff Officer'
  modalError.value = ''
  modalSuccess.value = ''
  isModalOpen.value = true
}

function openEditModal(staff: AuthorizedStaff) {
  modalMode.value = 'edit'
  formStaffId.value = staff.id
  formName.value = staff.name
  formEmail.value = staff.email
  formRole.value = staff.role
  modalError.value = ''
  modalSuccess.value = ''
  isModalOpen.value = true
}

function closeModal() {
  isModalOpen.value = false
  modalError.value = ''
  modalSuccess.value = ''
}

async function handleSaveStaff() {
  modalError.value = ''
  modalSuccess.value = ''

  if (!formName.value.trim()) {
    modalError.value = 'Please enter the staff member full name.'
    return
  }
  if (!formEmail.value.trim() || !formEmail.value.includes('@')) {
    modalError.value = 'Please enter a valid official email address.'
    return
  }

  modalLoading.value = true
  if (modalMode.value === 'add') {
    const res = await authStore.addStaff({
      name: formName.value.trim(),
      email: formEmail.value.trim().toLowerCase(),
      role: formRole.value,
    })
    modalLoading.value = false
    if (res.ok) {
      modalSuccess.value = res.message
      setTimeout(() => {
        closeModal()
      }, 700)
    } else {
      modalError.value = res.message
    }
  } else if (modalMode.value === 'edit' && formStaffId.value) {
    const res = await authStore.updateStaff({
      id: formStaffId.value,
      name: formName.value.trim(),
      role: formRole.value,
    })
    modalLoading.value = false
    if (res.ok) {
      modalSuccess.value = res.message
      setTimeout(() => {
        closeModal()
      }, 700)
    } else {
      modalError.value = res.message
    }
  }
}

async function handleRevoke(staff: AuthorizedStaff) {
  const isSelf = staff.email.toLowerCase() === authStore.user?.email.toLowerCase()
  const isAdmin = staff.role === 'Admin'

  const promptMsg = isSelf
    ? `⚠️ CAUTION: You are about to revoke YOUR OWN account (${staff.email})!\n\nIf you proceed, you will be logged out immediately. Do you wish to continue?`
    : isAdmin
    ? `Are you sure you want to remove Administrator ${staff.name} (${staff.email})?\nThey will lose all administrative privileges.`
    : `Are you sure you want to revoke authorization for ${staff.name} (${staff.email})?\nThey will no longer be able to access the system.`

  const confirmed = confirm(promptMsg)
  if (!confirmed) return

  const res = await authStore.deleteStaff(staff.id)
  if (res.ok) {
    if (isSelf) {
      authStore.logout()
      window.location.href = '/login'
    }
  } else {
    alert(res.message)
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return ((parts[0]?.charAt(0) || '') + (parts[parts.length - 1]?.charAt(0) || '')).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || 'ST'
}
</script>

<template>
  <div class="staff-view-container">
    <!-- Top Header & Actions -->
    <div class="staff-header">
      <div class="header-titles">
        <h2 class="view-title">Staff Authorization Management</h2>
        <p class="view-desc">
          Manage division staff accounts authorized to access and modify Teacher Needs Analysis records.
        </p>
      </div>
      <button class="btn-add-staff" @click="openAddModal">
        <span class="btn-icon">➕</span>
        <span>Authorize New Staff</span>
      </button>
    </div>

    <!-- Summary Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <div class="metric-icon">👥</div>
        <div class="metric-details">
          <span class="metric-num">{{ staffList.length }}</span>
          <span class="metric-label">Total Authorized Personnel</span>
        </div>
      </div>
      <div class="metric-card card-admin">
        <div class="metric-icon">🛡️</div>
        <div class="metric-details">
          <span class="metric-num">{{ adminCount }}</span>
          <span class="metric-label">Division Administrators</span>
        </div>
      </div>
      <div class="metric-card card-staff">
        <div class="metric-icon">📋</div>
        <div class="metric-details">
          <span class="metric-num">{{ staffOfficerCount }}</span>
          <span class="metric-label">Staff Officers</span>
        </div>
      </div>
    </div>

    <!-- Toolbar: Search & Role Filters -->
    <div class="table-toolbar">
      <div class="search-wrap">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by personnel name or email address..."
          class="search-input"
        />
      </div>

      <div class="filter-pills">
        <button
          class="pill-btn"
          :class="{ active: selectedRoleFilter === 'ALL' }"
          @click="selectedRoleFilter = 'ALL'"
        >
          All ({{ staffList.length }})
        </button>
        <button
          class="pill-btn"
          :class="{ active: selectedRoleFilter === 'Admin' }"
          @click="selectedRoleFilter = 'Admin'"
        >
          Admins ({{ adminCount }})
        </button>
        <button
          class="pill-btn"
          :class="{ active: selectedRoleFilter === 'Staff Officer' }"
          @click="selectedRoleFilter = 'Staff Officer'"
        >
          Staff Officers ({{ staffOfficerCount }})
        </button>
      </div>
    </div>

    <!-- Staff Table -->
    <div class="table-card">
      <div v-if="authStore.state.isLoadingStaff" class="loading-state">
        <div class="spinner"></div>
        <span>Loading authorized personnel records from database...</span>
      </div>

      <div v-else-if="filteredStaff.length === 0" class="empty-state">
        <div class="empty-icon">📂</div>
        <h3>No Personnel Found</h3>
        <p>No staff records matched your search query or filter criteria.</p>
      </div>

      <div v-else class="table-scroll-container">
        <table class="staff-table">
          <thead>
            <tr>
              <th>Personnel</th>
              <th>Official Email Address</th>
              <th>System Role</th>
              <th>Authorization Status</th>
              <th>Date Authorized</th>
              <th class="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="staff in filteredStaff" :key="staff.id">
              <td>
                <div class="user-cell">
                  <div v-if="staff.avatar" class="user-avatar-img-wrap">
                    <img :src="staff.avatar" alt="Avatar" class="user-avatar-img" />
                  </div>
                  <div v-else class="user-avatar-badge" :class="staff.role === 'Admin' ? 'avatar-admin' : 'avatar-staff'">
                    {{ getInitials(staff.name) }}
                  </div>
                  <div class="user-name-wrap">
                    <span class="user-full-name">{{ staff.name }}</span>
                    <span v-if="staff.email === authStore.user?.email" class="self-tag">(You)</span>
                  </div>
                </div>
              </td>
              <td class="email-cell">
                <code>{{ staff.email }}</code>
              </td>
              <td>
                <span class="role-badge" :class="staff.role === 'Admin' ? 'badge-admin' : 'badge-staff'">
                  {{ staff.role === 'Admin' ? '🛡️ Administrator' : '📋 Staff Officer' }}
                </span>
              </td>
              <td>
                <span class="status-badge status-active">
                  <span class="status-dot"></span>
                  <span>Authorized</span>
                </span>
              </td>
              <td class="date-cell">
                {{ staff.createdAt ? staff.createdAt.split(' ')[0] : 'Active' }}
              </td>
              <td class="text-right">
                <div class="action-btn-group">
                  <button class="btn-action btn-edit" title="Edit Role or Name" @click="openEditModal(staff)">
                    ✏️ Edit
                  </button>
                  <button
                    class="btn-action btn-revoke"
                    :title="staff.role === 'Admin' ? 'Remove Administrator' : 'Revoke Staff Access'"
                    @click="handleRevoke(staff)"
                  >
                    🚫 Remove
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal: Add / Edit Staff -->
    <div v-if="isModalOpen" class="modal-backdrop" @click.self="closeModal">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ modalMode === 'add' ? '➕ Authorize New Personnel' : '✏️ Edit Staff Authorization' }}
          </h3>
          <button class="modal-close-btn" @click="closeModal">✕</button>
        </div>

        <div class="modal-body">
          <div v-if="modalError" class="modal-alert alert-error">
            ⚠️ {{ modalError }}
          </div>
          <div v-if="modalSuccess" class="modal-alert alert-success">
            ✅ {{ modalSuccess }}
          </div>

          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input
              v-model="formName"
              type="text"
              class="form-input"
              placeholder="e.g., Juan Dela Cruz"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Official Email Address</label>
            <input
              v-model="formEmail"
              type="email"
              class="form-input"
              :disabled="modalMode === 'edit'"
              placeholder="e.g., juan.delacruz@deped.gov.ph"
            />
            <span v-if="modalMode === 'edit'" class="form-hint">
              Email addresses cannot be changed once authorized. To use a different email, revoke and re-authorize.
            </span>
            <span v-else class="form-hint">
              This email will be permitted to log in via Google Workspace Single Sign-On.
            </span>
          </div>

          <div class="form-group">
            <label class="form-label">Assigned Role & Permissions</label>
            <div class="role-selector-grid">
              <label class="role-option" :class="{ selected: formRole === 'Staff Officer' }">
                <input
                  v-model="formRole"
                  type="radio"
                  value="Staff Officer"
                  class="role-radio"
                />
                <div class="role-content">
                  <div class="role-title">📋 Staff Officer</div>
                  <div class="role-desc">Can view teacher needs analysis, register deployment movements, and update transfers.</div>
                </div>
              </label>

              <label class="role-option" :class="{ selected: formRole === 'Admin' }">
                <input
                  v-model="formRole"
                  type="radio"
                  value="Admin"
                  class="role-radio"
                />
                <div class="role-content">
                  <div class="role-title">🛡️ Division Administrator</div>
                  <div class="role-desc">Full system authority: import school data, edit database, manage authorized staff, and change school year.</div>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" :disabled="modalLoading" @click="closeModal">
            Cancel
          </button>
          <button class="btn-primary" :disabled="modalLoading" @click="handleSaveStaff">
            {{ modalLoading ? 'Saving...' : modalMode === 'add' ? 'Authorize Personnel' : 'Update Authorization' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.staff-view-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.staff-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: #ffffff;
  padding: 22px 28px;
  border-radius: 14px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.view-title {
  font-size: 1.45rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 4px 0;
}

.view-desc {
  font-size: 0.92rem;
  color: #64748b;
  margin: 0;
}

.btn-add-staff {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
  color: #ffffff;
  border: none;
  padding: 11px 20px;
  border-radius: 9px;
  font-weight: 600;
  font-size: 0.92rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(2, 132, 199, 0.25);
}

.btn-add-staff:hover {
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(2, 132, 199, 0.35);
}

/* Metric Cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 18px;
  background: #ffffff;
  padding: 20px 24px;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.03);
}

.metric-icon {
  font-size: 2rem;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f1f5f9;
  border-radius: 10px;
}

.card-admin .metric-icon {
  background: #eff6ff;
  color: #1d4ed8;
}

.card-staff .metric-icon {
  background: #f0fdf4;
  color: #16a34a;
}

.metric-details {
  display: flex;
  flex-direction: column;
}

.metric-num {
  font-size: 1.85rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.1;
}

.metric-label {
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  margin-top: 3px;
}

/* Table Toolbar */
.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 14px;
}

.search-wrap {
  position: relative;
  flex: 1;
  min-width: 280px;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.95rem;
  color: #94a3b8;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 40px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #1e293b;
  box-sizing: border-box;
}

.search-input:focus {
  outline: none;
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.filter-pills {
  display: flex;
  gap: 8px;
}

.pill-btn {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
  transition: all 0.15s ease;
}

.pill-btn.active {
  background: #0f172a;
  color: #ffffff;
  border-color: #0f172a;
}

/* Table Card */
.table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.table-scroll-container {
  overflow-x: auto;
}

.staff-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 0.9rem;
}

.staff-table th {
  background: #f8fafc;
  color: #475569;
  font-weight: 700;
  padding: 14px 18px;
  border-bottom: 2px solid #e2e8f0;
  white-space: nowrap;
}

.staff-table td {
  padding: 14px 18px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.staff-table tbody tr:hover {
  background: #f8fafc;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar-badge {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.82rem;
  font-weight: 800;
}

.avatar-admin {
  background: #dbeafe;
  color: #1e40af;
}

.avatar-staff {
  background: #e0f2fe;
  color: #0369a1;
}

.user-avatar-img-wrap {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
}

.user-avatar-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.user-full-name {
  font-weight: 600;
  color: #0f172a;
}

.self-tag {
  font-size: 0.75rem;
  background: #e2e8f0;
  color: #475569;
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 600;
  margin-left: 6px;
}

.email-cell code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.85rem;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 4px;
  color: #334155;
}

.role-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 700;
}

.badge-admin {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.badge-staff {
  background: #f0fdf4;
  color: #15803d;
  border: 1px solid #bbf7d0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.82rem;
  font-weight: 600;
  color: #166534;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #22c55e;
}

.date-cell {
  color: #64748b;
  font-size: 0.85rem;
}

.text-right {
  text-align: right;
}

.action-btn-group {
  display: inline-flex;
  gap: 6px;
}

.btn-action {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 600;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-action:hover:not(:disabled) {
  background: #f1f5f9;
}

.btn-revoke {
  color: #dc2626;
  border-color: #fecaca;
}

.btn-revoke:hover:not(:disabled) {
  background: #fef2f2;
}

.btn-action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 20px;
  color: #64748b;
  text-align: center;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid #e2e8f0;
  border-top-color: #0284c7;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin-bottom: 12px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Modal Styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 9999;
  backdrop-filter: blur(3px);
}

.modal-card {
  background: #ffffff;
  border-radius: 14px;
  width: 100%;
  max-width: 520px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: modalIn 0.2s ease-out;
}

@keyframes modalIn {
  from {
    opacity: 0;
    transform: scale(0.96);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}

.modal-close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
}

.modal-body {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.modal-alert {
  padding: 10px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 500;
}

.alert-error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.alert-success {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: #334155;
}

.form-input {
  padding: 10px 12px;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.92rem;
  color: #0f172a;
}

.form-input:focus {
  outline: none;
  border-color: #0284c7;
  box-shadow: 0 0 0 3px rgba(2, 132, 199, 0.15);
}

.form-input:disabled {
  background: #f1f5f9;
  cursor: not-allowed;
}

.form-hint {
  font-size: 0.78rem;
  color: #64748b;
}

.role-selector-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.role-option {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 12px 14px;
  border: 1.5px solid #cbd5e1;
  border-radius: 9px;
  cursor: pointer;
  transition: all 0.15s ease;
}

.role-option.selected {
  border-color: #0284c7;
  background: #f0f9ff;
}

.role-radio {
  margin-top: 3px;
}

.role-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: #0f172a;
}

.role-desc {
  font-size: 0.78rem;
  color: #64748b;
  margin-top: 2px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 24px;
  border-top: 1px solid #e2e8f0;
  background: #f8fafc;
}

.btn-secondary {
  padding: 9px 16px;
  border: 1px solid #cbd5e1;
  background: #ffffff;
  color: #475569;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary {
  padding: 9px 18px;
  background: #0284c7;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
}

.btn-primary:hover:not(:disabled) {
  background: #0369a1;
}

@media (max-width: 768px) {
  .staff-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .btn-add-staff {
    width: 100%;
    justify-content: center;
  }
  .filter-pills {
    width: 100%;
    overflow-x: auto;
    padding-bottom: 4px;
  }
}
</style>

