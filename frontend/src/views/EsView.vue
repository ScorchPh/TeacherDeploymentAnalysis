<script setup lang="ts">
import { ref, computed } from 'vue'
import { tnaStore } from '../stores/tnaStore'
import type { EsRecord } from '../types/tna'
import ImportModal from '../components/ImportModal.vue'

const searchQuery = ref('')
const statusFilter = ref<'ALL' | 'NEEDS' | 'SURPLUS'>('ALL')
const isImportModalOpen = ref(false)
const isAddModalOpen = ref(false)
const editingRecordId = ref<string | null>(null)

// Form state for adding/editing
const formState = ref({
  schoolId: '',
  schoolName: '',
  required: 0,
  existing: 0,
  transferOut: 0,
  transferIn: 0,
})

// Filtered Records
const filteredRecords = computed(() => {
  return tnaStore.esRecords.filter((record) => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchSearch =
      !q ||
      record.schoolName.toLowerCase().includes(q) ||
      record.schoolId.toLowerCase().includes(q)

    if (!matchSearch) return false

    const needs = tnaStore.calcEsNeeds(record)
    if (statusFilter.value === 'NEEDS') return needs > 0
    if (statusFilter.value === 'SURPLUS') return needs <= 0
    return true
  })
})

// Summary metrics across all ES schools
const totalSchools = computed(() => tnaStore.esRecords.length)
const totalRequired = computed(() =>
  tnaStore.esRecords.reduce((acc, r) => acc + (Number(r.required) || 0), 0)
)
const totalExisting = computed(() =>
  tnaStore.esRecords.reduce((acc, r) => acc + (Number(r.existing) || 0), 0)
)
const totalGap = computed(() => totalRequired.value - totalExisting.value)
const totalTransferOut = computed(() =>
  tnaStore.esRecords.reduce((acc, r) => acc + (Number(r.transferOut) || 0), 0)
)
const totalTransferIn = computed(() =>
  tnaStore.esRecords.reduce((acc, r) => acc + (Number(r.transferIn) || 0), 0)
)
const totalNeeds = computed(
  () => totalGap.value + totalTransferOut.value - totalTransferIn.value
)

function openAddModal() {
  editingRecordId.value = null
  formState.value = {
    schoolId: '',
    schoolName: '',
    required: 0,
    existing: 0,
    transferOut: 0,
    transferIn: 0,
  }
  isAddModalOpen.value = true
}

function openEditModal(record: EsRecord) {
  editingRecordId.value = record.id
  formState.value = {
    schoolId: record.schoolId,
    schoolName: record.schoolName,
    required: record.required,
    existing: record.existing,
    transferOut: record.transferOut,
    transferIn: record.transferIn,
  }
  isAddModalOpen.value = true
}

function saveRecord() {
  if (!formState.value.schoolName.trim()) return

  if (editingRecordId.value) {
    tnaStore.updateEsRecord(editingRecordId.value, {
      schoolId: formState.value.schoolId,
      schoolName: formState.value.schoolName,
      required: Number(formState.value.required) || 0,
      existing: Number(formState.value.existing) || 0,
      transferOut: Number(formState.value.transferOut) || 0,
      transferIn: Number(formState.value.transferIn) || 0,
    })
  } else {
    tnaStore.addEsRecord({
      schoolId: formState.value.schoolId,
      schoolName: formState.value.schoolName,
      required: Number(formState.value.required) || 0,
      existing: Number(formState.value.existing) || 0,
      transferOut: Number(formState.value.transferOut) || 0,
      transferIn: Number(formState.value.transferIn) || 0,
    })
  }
  isAddModalOpen.value = false
}

function deleteRecord(id: string, name: string) {
  if (confirm(`Are you sure you want to remove "${name}" from the ES analysis table?`)) {
    tnaStore.deleteEsRecord(id)
  }
}

function handleImport(importedData: any[]) {
  tnaStore.importEsRecords(importedData)
}

function resetToDefault() {
  if (confirm('Reset ES table to default official records?')) {
    tnaStore.resetAll()
  }
}
</script>

<template>
  <div class="analysis-view">
    <!-- Top Summary Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">Schools Monitored</span>
        <div class="metric-val">{{ totalSchools }}</div>
        <span class="metric-sub">Elementary Level</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Total Required</span>
        <div class="metric-val text-primary">{{ totalRequired }}</div>
        <span class="metric-sub">Teachers Needed</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Total Existing</span>
        <div class="metric-val">{{ totalExisting }}</div>
        <span class="metric-sub">Active in Schools</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Total GAP</span>
        <div class="metric-val" :class="totalGap > 0 ? 'text-red' : 'text-green'">
          {{ totalGap > 0 ? `+${totalGap}` : totalGap }}
        </div>
        <span class="metric-sub">Required - Existing</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Transfers</span>
        <div class="metric-val text-muted-val">
          <span class="t-out-txt">Out: {{ totalTransferOut }}</span>
          <span class="t-divider">|</span>
          <span class="t-in-txt">In: {{ totalTransferIn }}</span>
        </div>
        <span class="metric-sub">Division Movement</span>
      </div>

      <div class="metric-card card-highlight">
        <span class="metric-label">Net Teacher Needs</span>
        <div class="metric-val text-danger">
          {{ totalNeeds > 0 ? `+${totalNeeds}` : totalNeeds }}
        </div>
        <span class="metric-sub">(GAP + T-Out) - T-In</span>
      </div>
    </div>

    <!-- Table Toolbar -->
    <div class="toolbar-box">
      <div class="toolbar-left">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search school name or School ID..."
            class="search-input"
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
        </div>

        <div class="filter-group">
          <button
            class="filter-pill"
            :class="{ active: statusFilter === 'ALL' }"
            @click="statusFilter = 'ALL'"
          >
            All ({{ totalSchools }})
          </button>
          <button
            class="filter-pill pill-danger"
            :class="{ active: statusFilter === 'NEEDS' }"
            @click="statusFilter = 'NEEDS'"
          >
            With Needs
          </button>
          <button
            class="filter-pill pill-success"
            :class="{ active: statusFilter === 'SURPLUS' }"
            @click="statusFilter = 'SURPLUS'"
          >
            Balanced / Surplus
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <button class="btn btn-secondary" @click="isImportModalOpen = true">
          📥 Import Excel / CSV
        </button>
        <button class="btn btn-primary" @click="openAddModal">
          ➕ Add School
        </button>
        <button class="btn btn-secondary btn-icon-only" title="Reset to official data" @click="resetToDefault">
          🔄
        </button>
      </div>
    </div>

    <!-- Main ES Analysis Table -->
    <div class="table-container">
      <div class="table-responsive">
        <table class="analysis-table">
          <thead>
            <tr>
              <th class="col-id">School ID</th>
              <th class="col-name">School Name</th>
              <th class="col-num col-req">Required</th>
              <th class="col-num col-exist">Existing</th>
              <th class="col-num col-gap">GAP</th>
              <th class="col-num col-tout">Transfer Out</th>
              <th class="col-num col-tin">Transfer In</th>
              <th class="col-num col-needs">Needs</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
              <td class="font-mono">{{ record.schoolId || '—' }}</td>
              <td class="font-bold school-name-cell">
                {{ record.schoolName }}
              </td>
              <!-- Required (Editable inline / click) -->
              <td class="col-num req-cell">
                {{ record.required }}
              </td>
              <!-- Existing -->
              <td class="col-num exist-cell">
                {{ record.existing }}
              </td>
              <!-- GAP: Required - Existing -->
              <td
                class="col-num font-semibold"
                :class="tnaStore.calcEsGap(record) > 0 ? 'text-red' : tnaStore.calcEsGap(record) < 0 ? 'text-blue' : 'text-muted'"
              >
                {{ tnaStore.calcEsGap(record) > 0 ? `+${tnaStore.calcEsGap(record)}` : tnaStore.calcEsGap(record) }}
              </td>
              <!-- Transfer Out -->
              <td class="col-num tout-cell">
                {{ record.transferOut }}
              </td>
              <!-- Transfer In -->
              <td class="col-num tin-cell">
                {{ record.transferIn }}
              </td>
              <!-- Needs: (GAP + Transfer Out) - Transfer In -->
              <td class="col-num needs-cell">
                <span
                  class="badge"
                  :class="
                    tnaStore.calcEsNeeds(record) > 0
                      ? 'badge-danger'
                      : tnaStore.calcEsNeeds(record) < 0
                      ? 'badge-surplus'
                      : 'badge-success'
                  "
                >
                  {{
                    tnaStore.calcEsNeeds(record) > 0
                      ? `+${tnaStore.calcEsNeeds(record)} Needs`
                      : tnaStore.calcEsNeeds(record) < 0
                      ? `${tnaStore.calcEsNeeds(record)} Excess`
                      : '0 Balanced'
                  }}
                </span>
              </td>
              <!-- Actions -->
              <td class="col-actions">
                <div class="actions-wrap">
                  <button class="action-btn" title="Edit School" @click="openEditModal(record)">
                    ✏️
                  </button>
                  <button class="action-btn delete" title="Delete School" @click="deleteRecord(record.id, record.schoolName)">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>

            <tr v-if="filteredRecords.length === 0">
              <td colspan="9" class="empty-row">
                No elementary schools matching your search or filter.
              </td>
            </tr>
          </tbody>

          <!-- Table Footer Total Row -->
          <tfoot v-if="filteredRecords.length > 0">
            <tr class="total-row">
              <td colspan="2" class="total-title">
                TOTAL ({{ filteredRecords.length }} Schools)
              </td>
              <td class="col-num font-bold">{{ totalRequired }}</td>
              <td class="col-num font-bold">{{ totalExisting }}</td>
              <td class="col-num font-bold" :class="totalGap > 0 ? 'text-red' : 'text-green'">
                {{ totalGap > 0 ? `+${totalGap}` : totalGap }}
              </td>
              <td class="col-num font-bold">{{ totalTransferOut }}</td>
              <td class="col-num font-bold">{{ totalTransferIn }}</td>
              <td class="col-num font-bold text-red">
                {{ totalNeeds > 0 ? `+${totalNeeds}` : totalNeeds }}
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Import Modal -->
    <ImportModal
      :is-open="isImportModalOpen"
      category="ES"
      @close="isImportModalOpen = false"
      @import="handleImport"
    />

    <!-- Add/Edit School Modal -->
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ editingRecordId ? 'Edit Elementary School' : 'Add Elementary School' }}</h3>
          <button class="close-x" @click="isAddModalOpen = false">✕</button>
        </div>

        <div class="modal-content">
          <div class="form-row">
            <div class="form-group">
              <label>School ID</label>
              <input v-model="formState.schoolId" type="text" placeholder="e.g. 119964" class="form-input" />
            </div>
            <div class="form-group flex-2">
              <label>School Name *</label>
              <input v-model="formState.schoolName" type="text" placeholder="e.g. Buaya ES" class="form-input" />
            </div>
          </div>

          <div class="form-grid-4">
            <div class="form-group">
              <label>Required Teachers</label>
              <input v-model.number="formState.required" type="number" min="0" class="form-input" />
            </div>
            <div class="form-group">
              <label>Existing Teachers</label>
              <input v-model.number="formState.existing" type="number" min="0" class="form-input" />
            </div>
            <div class="form-group">
              <label>Transfer Out</label>
              <input v-model.number="formState.transferOut" type="number" min="0" class="form-input" />
            </div>
            <div class="form-group">
              <label>Transfer In</label>
              <input v-model.number="formState.transferIn" type="number" min="0" class="form-input" />
            </div>
          </div>

          <!-- Formula Preview Box -->
          <div class="calc-preview">
            <div class="calc-item">
              <span>Calculated GAP:</span>
              <strong :class="formState.required - formState.existing > 0 ? 'text-red' : 'text-green'">
                {{ formState.required - formState.existing }}
              </strong>
            </div>
            <div class="calc-item">
              <span>Final Needs:</span>
              <strong :class="(formState.required - formState.existing + formState.transferOut - formState.transferIn) > 0 ? 'text-red' : 'text-green'">
                {{ (formState.required - formState.existing) + formState.transferOut - formState.transferIn }}
              </strong>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
          <button class="btn btn-primary" @click="saveRecord">
            {{ editingRecordId ? 'Save Changes' : 'Add to ES Table' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.analysis-view {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

/* Metric Cards */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 1rem;
}

.metric-card {
  background: var(--color-card-bg);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 1rem 1.15rem;
  box-shadow: var(--shadow-sm);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.card-highlight {
  background: #fff1f2;
  border-color: #fecdd3;
}

.metric-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--color-text-muted);
}

.metric-val {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--color-text-main);
  line-height: 1.2;
}

.metric-sub {
  font-size: 0.72rem;
  color: var(--color-text-light);
}

.text-primary {
  color: var(--color-primary);
}

.text-red {
  color: #dc2626;
}

.text-blue {
  color: #0284c7;
}

.text-green {
  color: #16a34a;
}

.text-danger {
  color: #b91c1c;
}

.text-muted-val {
  font-size: 1.15rem;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.t-out-txt {
  color: #ea580c;
  font-size: 0.95rem;
}

.t-in-txt {
  color: #059669;
  font-size: 0.95rem;
}

.t-divider {
  color: #cbd5e1;
  font-weight: 300;
}

/* Toolbar */
.toolbar-box {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: 0.75rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  box-shadow: var(--shadow-sm);
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.search-input-wrap {
  position: relative;
  width: 320px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.85rem;
  opacity: 0.6;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2rem 0.5rem 2.2rem;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  outline: none;
  background: #f8fafc;
}

.search-input:focus {
  border-color: var(--color-primary);
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.clear-btn {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  font-size: 0.8rem;
  cursor: pointer;
  color: #94a3b8;
}

.filter-group {
  display: flex;
  gap: 0.35rem;
  background: #f1f5f9;
  padding: 0.2rem;
  border-radius: var(--radius-sm);
}

.filter-pill {
  border: none;
  background: transparent;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-muted);
  transition: all 0.15s ease;
}

.filter-pill.active {
  background: #ffffff;
  color: var(--color-text-main);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.filter-pill.pill-danger.active {
  background: #fee2e2;
  color: #991b1b;
}

.filter-pill.pill-success.active {
  background: #dcfce7;
  color: #166534;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.btn-icon-only {
  padding: 0.5rem 0.75rem;
  font-size: 0.95rem;
}

/* Table */
.table-container {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
}

.analysis-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: left;
}

.analysis-table th {
  background: #f8fafc;
  padding: 0.85rem 1rem;
  font-weight: 700;
  font-size: 0.8rem;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

/* Yellow tint on required header to reflect Excel standard */
.analysis-table th.col-req {
  background-color: #fef08a;
  color: #854d0e;
}

.analysis-table th.col-needs {
  background-color: #fee2e2;
  color: #991b1b;
}

.analysis-table td {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.analysis-table tbody tr:hover {
  background-color: #f8fafc;
}

.font-mono {
  font-family: monospace;
  font-size: 0.82rem;
  color: #64748b;
}

.school-name-cell {
  font-size: 0.9rem;
  color: #0f172a;
}

.col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.col-actions {
  text-align: center;
  width: 90px;
}

.req-cell {
  background-color: rgba(254, 240, 138, 0.15);
  font-weight: 600;
}

.exist-cell {
  background-color: rgba(241, 245, 249, 0.5);
}

.tout-cell {
  color: #c2410c;
}

.tin-cell {
  color: #047857;
}

.actions-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
}

.action-btn {
  background: transparent;
  border: none;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: var(--radius-sm);
  transition: background 0.15s ease;
}

.action-btn:hover {
  background: #e2e8f0;
}

.action-btn.delete:hover {
  background: #fee2e2;
}

.empty-row {
  text-align: center;
  padding: 3rem !important;
  color: #94a3b8;
  font-style: italic;
}

/* Total row */
.total-row {
  background-color: #f1f5f9;
  border-top: 2px solid #cbd5e1;
}

.total-row td {
  padding: 0.85rem 1rem;
}

.total-title {
  font-weight: 800;
  color: #1e293b;
  letter-spacing: 0.04em;
}

/* Modal styling */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 540px;
  overflow: hidden;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.15rem;
  font-weight: 700;
}

.close-x {
  background: transparent;
  border: none;
  font-size: 1.15rem;
  color: #94a3b8;
  cursor: pointer;
}

.modal-content {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-row {
  display: flex;
  gap: 1rem;
}

.flex-2 {
  flex: 2;
}

.form-grid-4 {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-group label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
}

.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  outline: none;
}

.form-input:focus {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.calc-preview {
  display: flex;
  justify-content: space-around;
  background: #f8fafc;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
}

.calc-item {
  display: flex;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  background: #f8fafc;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>
