<script setup lang="ts">
import { ref, computed } from 'vue'
import { tnaStore } from '../stores/tnaStore'
import { SHS_SUBJECTS, type ShsRecord, type ShsSubject } from '../types/tna'
import ImportModal from '../components/ImportModal.vue'

const searchQuery = ref('')
const statusFilter = ref<'ALL' | 'NEEDS' | 'SURPLUS'>('ALL')
const activeViewMode = ref<'TOTALS' | 'SUBJECT_FOCUS' | 'FULL_MATRIX'>('TOTALS')
const selectedSubject = ref<ShsSubject>('ABM')
const isImportModalOpen = ref(false)
const isAddModalOpen = ref(false)
const editingRecordId = ref<string | null>(null)

// Form State
function initForm() {
  const req: Record<ShsSubject, number> = {} as any
  const exist: Record<ShsSubject, number> = {} as any
  const tout: Record<ShsSubject, number> = {} as any
  const tin: Record<ShsSubject, number> = {} as any

  SHS_SUBJECTS.forEach((s) => {
    req[s] = 0
    exist[s] = 0
    tout[s] = 0
    tin[s] = 0
  })

  return {
    schoolId: '',
    schoolName: '',
    required: req,
    existing: exist,
    transferOut: tout,
    transferIn: tin,
  }
}

const formState = ref(initForm())

// Filtered Records
const filteredRecords = computed(() => {
  return tnaStore.shsRecords.filter((record) => {
    const q = searchQuery.value.toLowerCase().trim()
    const matchSearch =
      !q ||
      record.schoolName.toLowerCase().includes(q) ||
      record.schoolId.toLowerCase().includes(q)

    if (!matchSearch) return false

    const totalNeeds = tnaStore.calcShsTotalNeeds(record)
    if (statusFilter.value === 'NEEDS') return totalNeeds > 0
    if (statusFilter.value === 'SURPLUS') return totalNeeds <= 0
    return true
  })
})

// Summary metrics across all SHS schools
const totalSchools = computed(() => tnaStore.shsRecords.length)
const totalRequired = computed(() =>
  tnaStore.shsRecords.reduce((acc, r) => acc + tnaStore.calcShsTotalRequired(r), 0)
)
const totalExisting = computed(() =>
  tnaStore.shsRecords.reduce((acc, r) => acc + tnaStore.calcShsTotalExisting(r), 0)
)
const totalGap = computed(() => totalRequired.value - totalExisting.value)
const totalTransferOut = computed(() =>
  tnaStore.shsRecords.reduce((acc, r) => acc + tnaStore.calcShsTotalTransferOut(r), 0)
)
const totalTransferIn = computed(() =>
  tnaStore.shsRecords.reduce((acc, r) => acc + tnaStore.calcShsTotalTransferIn(r), 0)
)
const totalNeeds = computed(
  () => totalGap.value + totalTransferOut.value - totalTransferIn.value
)

function openAddModal() {
  editingRecordId.value = null
  formState.value = initForm()
  isAddModalOpen.value = true
}

function openEditModal(record: ShsRecord) {
  editingRecordId.value = record.id
  formState.value = {
    schoolId: record.schoolId,
    schoolName: record.schoolName,
    required: { ...record.required },
    existing: { ...record.existing },
    transferOut: { ...record.transferOut },
    transferIn: { ...record.transferIn },
  }
  isAddModalOpen.value = true
}

function saveRecord() {
  if (!formState.value.schoolName.trim()) return

  if (editingRecordId.value) {
    tnaStore.updateShsRecord(editingRecordId.value, {
      schoolId: formState.value.schoolId,
      schoolName: formState.value.schoolName,
      required: formState.value.required,
      existing: formState.value.existing,
      transferOut: formState.value.transferOut,
      transferIn: formState.value.transferIn,
    })
  } else {
    tnaStore.addShsRecord({
      schoolId: formState.value.schoolId,
      schoolName: formState.value.schoolName,
      required: formState.value.required,
      existing: formState.value.existing,
      transferOut: formState.value.transferOut,
      transferIn: formState.value.transferIn,
    })
  }
  isAddModalOpen.value = false
}

function deleteRecord(id: string, name: string) {
  if (confirm(`Remove "${name}" from SHS Analysis table?`)) {
    tnaStore.deleteShsRecord(id)
  }
}

function handleImport(importedData: any[]) {
  importedData.forEach((row) => {
    const existingIdx = tnaStore.shsRecords.findIndex(
      (r) =>
        (row.schoolId && r.schoolId === String(row.schoolId)) ||
        (row.schoolName &&
          r.schoolName.toLowerCase() === String(row.schoolName).toLowerCase())
    )

    if (existingIdx !== -1 && tnaStore.shsRecords[existingIdx]) {
      const cur = tnaStore.shsRecords[existingIdx]!
      if (row.required !== undefined) {
        cur.required['ABM'] = Number(row.required) || cur.required['ABM']
      }
    } else if (row.schoolName || row.schoolId) {
      const fresh = initForm()
      fresh.schoolId = String(row.schoolId || '')
      fresh.schoolName = String(row.schoolName || 'Unnamed SHS')
      fresh.required['ABM'] = Number(row.required) || 0
      fresh.existing['ABM'] = Number(row.existing) || 0
      tnaStore.addShsRecord(fresh)
    }
  })
}

function resetToDefault() {
  if (confirm('Reset SHS table to default official records?')) {
    tnaStore.resetAll()
  }
}
</script>

<template>
  <div class="analysis-view">
    <!-- Top Summary Metric Cards -->
    <div class="metrics-grid">
      <div class="metric-card">
        <span class="metric-label">SHS Schools</span>
        <div class="metric-val">{{ totalSchools }}</div>
        <span class="metric-sub">Senior High Level</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Total Required</span>
        <div class="metric-val text-primary">{{ totalRequired }}</div>
        <span class="metric-sub">All Track Specializations</span>
      </div>

      <div class="metric-card">
        <span class="metric-label">Total Existing</span>
        <div class="metric-val">{{ totalExisting }}</div>
        <span class="metric-sub">Active SHS Faculty</span>
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
        <span class="metric-sub">Track Staff Movement</span>
      </div>

      <div class="metric-card card-highlight">
        <span class="metric-label">Total Needs</span>
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
            placeholder="Search SHS school name or ID..."
            class="search-input"
          />
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
            Surplus / Balanced
          </button>
        </div>

        <!-- View Mode Switcher -->
        <div class="view-mode-group">
          <button
            class="view-btn"
            :class="{ active: activeViewMode === 'TOTALS' }"
            title="School totals overview"
            @click="activeViewMode = 'TOTALS'"
          >
            📊 Totals Overview
          </button>
          <button
            class="view-btn"
            :class="{ active: activeViewMode === 'SUBJECT_FOCUS' }"
            title="Focus on specific track/subject"
            @click="activeViewMode = 'SUBJECT_FOCUS'"
          >
            🎯 Subject/Track Focus
          </button>
          <button
            class="view-btn"
            :class="{ active: activeViewMode === 'FULL_MATRIX' }"
            title="All subjects and columns matrix"
            @click="activeViewMode = 'FULL_MATRIX'"
          >
            📑 All Tracks Matrix
          </button>
        </div>

        <!-- Subject dropdown when in SUBJECT_FOCUS mode -->
        <div v-if="activeViewMode === 'SUBJECT_FOCUS'" class="subject-select-wrap">
          <label>Subject / Track:</label>
          <select v-model="selectedSubject" class="subject-select">
            <option v-for="subj in SHS_SUBJECTS" :key="subj" :value="subj">
              {{ subj }}
            </option>
          </select>
        </div>
      </div>

      <div class="toolbar-right">
        <button class="btn btn-secondary" @click="isImportModalOpen = true">
          📥 Import Data
        </button>
        <button class="btn btn-primary" @click="openAddModal">
          ➕ Add SHS School
        </button>
        <button class="btn btn-secondary btn-icon-only" title="Reset to official records" @click="resetToDefault">
          🔄
        </button>
      </div>
    </div>

    <!-- Main SHS Analysis Table -->
    <div class="table-container">
      <div class="table-responsive">
        
        <!-- MODE 1: TOTALS OVERVIEW (Compact & Clean) -->
        <table v-if="activeViewMode === 'TOTALS'" class="analysis-table">
          <thead>
            <tr>
              <th class="col-id">School ID</th>
              <th class="col-name">School Name</th>
              <th class="col-num col-req">Total Required</th>
              <th class="col-num col-exist">Total Existing</th>
              <th class="col-num col-gap">Total GAP</th>
              <th class="col-num col-tout">Total T-Out</th>
              <th class="col-num col-tin">Total T-In</th>
              <th class="col-num col-needs">Total Needs</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
              <td class="font-mono">{{ record.schoolId || '—' }}</td>
              <td class="font-bold school-name-cell">{{ record.schoolName }}</td>
              <td class="col-num req-cell font-semibold">
                {{ tnaStore.calcShsTotalRequired(record) }}
              </td>
              <td class="col-num exist-cell">
                {{ tnaStore.calcShsTotalExisting(record) }}
              </td>
              <td
                class="col-num font-semibold"
                :class="tnaStore.calcShsTotalGap(record) > 0 ? 'text-red' : tnaStore.calcShsTotalGap(record) < 0 ? 'text-blue' : 'text-muted'"
              >
                {{ tnaStore.calcShsTotalGap(record) > 0 ? `+${tnaStore.calcShsTotalGap(record)}` : tnaStore.calcShsTotalGap(record) }}
              </td>
              <td class="col-num tout-cell">
                {{ tnaStore.calcShsTotalTransferOut(record) }}
              </td>
              <td class="col-num tin-cell">
                {{ tnaStore.calcShsTotalTransferIn(record) }}
              </td>
              <td class="col-num needs-cell">
                <span
                  class="badge"
                  :class="
                    tnaStore.calcShsTotalNeeds(record) > 0
                      ? 'badge-danger'
                      : tnaStore.calcShsTotalNeeds(record) < 0
                      ? 'badge-surplus'
                      : 'badge-success'
                  "
                >
                  {{
                    tnaStore.calcShsTotalNeeds(record) > 0
                      ? `+${tnaStore.calcShsTotalNeeds(record)} Needs`
                      : tnaStore.calcShsTotalNeeds(record) < 0
                      ? `${tnaStore.calcShsTotalNeeds(record)} Excess`
                      : '0 Balanced'
                  }}
                </span>
              </td>
              <td class="col-actions">
                <div class="actions-wrap">
                  <button class="action-btn" title="Edit School" @click="openEditModal(record)">✏️</button>
                  <button class="action-btn delete" title="Delete School" @click="deleteRecord(record.id, record.schoolName)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr class="total-row">
              <td colspan="2" class="total-title">TOTAL ({{ filteredRecords.length }} Schools)</td>
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

        <!-- MODE 2: SUBJECT FOCUS VIEW -->
        <table v-else-if="activeViewMode === 'SUBJECT_FOCUS'" class="analysis-table">
          <thead>
            <tr>
              <th class="col-id">School ID</th>
              <th class="col-name">School Name</th>
              <th class="col-num col-req">{{ selectedSubject }} Required</th>
              <th class="col-num col-exist">{{ selectedSubject }} Existing</th>
              <th class="col-num col-gap">{{ selectedSubject }} GAP</th>
              <th class="col-num col-tout">{{ selectedSubject }} T-Out</th>
              <th class="col-num col-tin">{{ selectedSubject }} T-In</th>
              <th class="col-num col-needs">{{ selectedSubject }} Needs</th>
              <th class="col-num font-bold">Overall School Needs</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
              <td class="font-mono">{{ record.schoolId || '—' }}</td>
              <td class="font-bold school-name-cell">{{ record.schoolName }}</td>
              <td class="col-num req-cell font-semibold">{{ record.required[selectedSubject] || 0 }}</td>
              <td class="col-num exist-cell">{{ record.existing[selectedSubject] || 0 }}</td>
              <td
                class="col-num font-semibold"
                :class="tnaStore.calcShsSubjectGap(record, selectedSubject) > 0 ? 'text-red' : 'text-green'"
              >
                {{ tnaStore.calcShsSubjectGap(record, selectedSubject) }}
              </td>
              <td class="col-num tout-cell">{{ record.transferOut[selectedSubject] || 0 }}</td>
              <td class="col-num tin-cell">{{ record.transferIn[selectedSubject] || 0 }}</td>
              <td class="col-num needs-cell">
                <span
                  class="badge"
                  :class="tnaStore.calcShsSubjectNeeds(record, selectedSubject) > 0 ? 'badge-danger' : 'badge-success'"
                >
                  {{ tnaStore.calcShsSubjectNeeds(record, selectedSubject) }}
                </span>
              </td>
              <td class="col-num font-bold" :class="tnaStore.calcShsTotalNeeds(record) > 0 ? 'text-red' : 'text-green'">
                {{ tnaStore.calcShsTotalNeeds(record) > 0 ? `+${tnaStore.calcShsTotalNeeds(record)}` : tnaStore.calcShsTotalNeeds(record) }}
              </td>
              <td class="col-actions">
                <div class="actions-wrap">
                  <button class="action-btn" title="Edit School" @click="openEditModal(record)">✏️</button>
                  <button class="action-btn delete" title="Delete School" @click="deleteRecord(record.id, record.schoolName)">🗑️</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- MODE 3: FULL MATRIX (Grouped columns per subject/track) -->
        <table v-else class="analysis-table matrix-table">
          <thead>
            <!-- Level 1: Category Groups -->
            <tr class="header-group-row">
              <th colspan="2" class="group-header">School Info</th>
              <th :colspan="SHS_SUBJECTS.length + 1" class="group-header group-req">Required Teachers Per Subject / Track</th>
              <th :colspan="SHS_SUBJECTS.length + 1" class="group-header group-exist">Existing Teachers Per Subject / Track</th>
              <th :colspan="SHS_SUBJECTS.length + 1" class="group-header group-gap">GAP (Req - Exist)</th>
              <th :colspan="SHS_SUBJECTS.length + 1" class="group-header group-tout">Transfers Out</th>
              <th :colspan="SHS_SUBJECTS.length + 1" class="group-header group-tin">Transfers In</th>
              <th :colspan="SHS_SUBJECTS.length + 1" class="group-header group-needs">Needs ((GAP + T-Out) - T-In)</th>
              <th class="group-header">Actions</th>
            </tr>
            <!-- Level 2: Specific Subjects + Total -->
            <tr>
              <th class="col-id">School ID</th>
              <th class="col-name">School Name</th>

              <!-- Required Subjects -->
              <th v-for="s in SHS_SUBJECTS" :key="`req-${s}`" class="sub-col">{{ s }}</th>
              <th class="sub-col sub-total">TOTAL</th>

              <!-- Existing Subjects -->
              <th v-for="s in SHS_SUBJECTS" :key="`exist-${s}`" class="sub-col">{{ s }}</th>
              <th class="sub-col sub-total">TOTAL</th>

              <!-- GAP Subjects -->
              <th v-for="s in SHS_SUBJECTS" :key="`gap-${s}`" class="sub-col">{{ s }}</th>
              <th class="sub-col sub-total">TOTAL</th>

              <!-- T-Out Subjects -->
              <th v-for="s in SHS_SUBJECTS" :key="`tout-${s}`" class="sub-col">{{ s }}</th>
              <th class="sub-col sub-total">TOTAL</th>

              <!-- T-In Subjects -->
              <th v-for="s in SHS_SUBJECTS" :key="`tin-${s}`" class="sub-col">{{ s }}</th>
              <th class="sub-col sub-total">TOTAL</th>

              <!-- Needs Subjects -->
              <th v-for="s in SHS_SUBJECTS" :key="`needs-${s}`" class="sub-col">{{ s }}</th>
              <th class="sub-col sub-total sub-total-needs">TOTAL</th>

              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="record in filteredRecords" :key="record.id">
              <td class="font-mono">{{ record.schoolId }}</td>
              <td class="font-bold school-name-cell">{{ record.schoolName }}</td>

              <!-- Required Values -->
              <td v-for="s in SHS_SUBJECTS" :key="`req-val-${s}`" class="col-num">{{ record.required[s] || 0 }}</td>
              <td class="col-num font-bold sub-total-val">{{ tnaStore.calcShsTotalRequired(record) }}</td>

              <!-- Existing Values -->
              <td v-for="s in SHS_SUBJECTS" :key="`exist-val-${s}`" class="col-num">{{ record.existing[s] || 0 }}</td>
              <td class="col-num font-bold sub-total-val">{{ tnaStore.calcShsTotalExisting(record) }}</td>

              <!-- GAP Values -->
              <td
                v-for="s in SHS_SUBJECTS"
                :key="`gap-val-${s}`"
                class="col-num font-semibold"
                :class="tnaStore.calcShsSubjectGap(record, s) > 0 ? 'text-red' : 'text-blue'"
              >
                {{ tnaStore.calcShsSubjectGap(record, s) }}
              </td>
              <td class="col-num font-bold sub-total-val">{{ tnaStore.calcShsTotalGap(record) }}</td>

              <!-- Transfer Out Values -->
              <td v-for="s in SHS_SUBJECTS" :key="`tout-val-${s}`" class="col-num tout-cell">{{ record.transferOut[s] || 0 }}</td>
              <td class="col-num font-bold sub-total-val">{{ tnaStore.calcShsTotalTransferOut(record) }}</td>

              <!-- Transfer In Values -->
              <td v-for="s in SHS_SUBJECTS" :key="`tin-val-${s}`" class="col-num tin-cell">{{ record.transferIn[s] || 0 }}</td>
              <td class="col-num font-bold sub-total-val">{{ tnaStore.calcShsTotalTransferIn(record) }}</td>

              <!-- Needs Values -->
              <td
                v-for="s in SHS_SUBJECTS"
                :key="`needs-val-${s}`"
                class="col-num font-bold"
                :class="tnaStore.calcShsSubjectNeeds(record, s) > 0 ? 'text-red' : 'text-green'"
              >
                {{ tnaStore.calcShsSubjectNeeds(record, s) }}
              </td>
              <td
                class="col-num font-bold sub-total-val"
                :class="tnaStore.calcShsTotalNeeds(record) > 0 ? 'text-red' : 'text-green'"
              >
                {{ tnaStore.calcShsTotalNeeds(record) }}
              </td>

              <td class="col-actions">
                <button class="action-btn" title="Edit" @click="openEditModal(record)">✏️</button>
              </td>
            </tr>
          </tbody>
        </table>

      </div>
    </div>

    <!-- Import Modal -->
    <ImportModal
      :is-open="isImportModalOpen"
      category="SHS"
      @close="isImportModalOpen = false"
      @import="handleImport"
    />

    <!-- Add/Edit Modal with Subject Inputs -->
    <div v-if="isAddModalOpen" class="modal-overlay" @click.self="isAddModalOpen = false">
      <div class="modal-card wide-card">
        <div class="modal-header">
          <h3>{{ editingRecordId ? 'Edit SHS School & Track Data' : 'Add SHS School' }}</h3>
          <button class="close-x" @click="isAddModalOpen = false">✕</button>
        </div>

        <div class="modal-content">
          <div class="form-row">
            <div class="form-group">
              <label>School ID</label>
              <input v-model="formState.schoolId" type="text" placeholder="e.g. 340001" class="form-input" />
            </div>
            <div class="form-group flex-2">
              <label>School Name *</label>
              <input v-model="formState.schoolName" type="text" placeholder="e.g. Babag SHS" class="form-input" />
            </div>
          </div>

          <!-- Subject Breakdown Grid -->
          <div class="subjects-entry-title">
            <span>Subject / Track Inputs (Required, Existing, T-Out, T-In)</span>
          </div>

          <div class="subject-table-wrap">
            <table class="subject-input-table">
              <thead>
                <tr>
                  <th>Subject / Track</th>
                  <th>Required</th>
                  <th>Existing</th>
                  <th>T-Out</th>
                  <th>T-In</th>
                  <th>GAP</th>
                  <th>Needs</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="subj in SHS_SUBJECTS" :key="subj">
                  <td class="font-bold">{{ subj }}</td>
                  <td><input v-model.number="formState.required[subj]" type="number" min="0" class="mini-input" /></td>
                  <td><input v-model.number="formState.existing[subj]" type="number" min="0" class="mini-input" /></td>
                  <td><input v-model.number="formState.transferOut[subj]" type="number" min="0" class="mini-input" /></td>
                  <td><input v-model.number="formState.transferIn[subj]" type="number" min="0" class="mini-input" /></td>
                  <td class="col-num font-semibold" :class="(formState.required[subj] - formState.existing[subj]) > 0 ? 'text-red' : 'text-green'">
                    {{ formState.required[subj] - formState.existing[subj] }}
                  </td>
                  <td class="col-num font-bold" :class="((formState.required[subj] - formState.existing[subj]) + formState.transferOut[subj] - formState.transferIn[subj]) > 0 ? 'text-red' : 'text-green'">
                    {{ (formState.required[subj] - formState.existing[subj]) + formState.transferOut[subj] - formState.transferIn[subj] }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="isAddModalOpen = false">Cancel</button>
          <button class="btn btn-primary" @click="saveRecord">
            {{ editingRecordId ? 'Save SHS Record' : 'Add to SHS Table' }}
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
  gap: 0.85rem;
  flex: 1;
}

.search-input-wrap {
  position: relative;
  width: 240px;
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
  padding: 0.5rem 1rem 0.5rem 2.2rem;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  outline: none;
  background: #f8fafc;
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
  padding: 0.35rem 0.65rem;
  font-size: 0.78rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: var(--color-text-muted);
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

.view-mode-group {
  display: flex;
  background: #f1f5f9;
  border-radius: var(--radius-sm);
  padding: 0.2rem;
}

.view-btn {
  border: none;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.35rem 0.65rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  color: #475569;
}

.view-btn.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0,0,0,0.06);
}

.subject-select-wrap {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: #475569;
}

.subject-select {
  padding: 0.35rem 0.6rem;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  outline: none;
  background: #ffffff;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.table-container {
  background: #ffffff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.table-responsive {
  overflow-x: auto;
  max-height: calc(100vh - 280px);
}

.analysis-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: left;
}

.analysis-table th {
  background: #f8fafc;
  padding: 0.75rem 0.85rem;
  font-weight: 700;
  font-size: 0.78rem;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  border-bottom: 2px solid var(--color-border);
  white-space: nowrap;
}

.analysis-table th.col-req {
  background-color: #fef08a;
  color: #854d0e;
}

.analysis-table th.col-needs {
  background-color: #fee2e2;
  color: #991b1b;
}

.analysis-table td {
  padding: 0.7rem 0.85rem;
  border-bottom: 1px solid var(--color-border);
  vertical-align: middle;
}

.font-mono {
  font-family: monospace;
  font-size: 0.82rem;
  color: #64748b;
}

.school-name-cell {
  color: #0f172a;
}

.col-num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.col-actions {
  text-align: center;
  width: 80px;
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
  font-size: 0.85rem;
  cursor: pointer;
  padding: 0.2rem 0.35rem;
  border-radius: var(--radius-sm);
}

.action-btn:hover {
  background: #e2e8f0;
}

/* Group Headers for Matrix view */
.header-group-row th {
  text-align: center;
  font-size: 0.75rem;
  border-right: 1px solid #cbd5e1;
}

.group-req {
  background-color: #fef08a !important;
  color: #854d0e !important;
}

.group-exist {
  background-color: #e2e8f0 !important;
  color: #334155 !important;
}

.group-gap {
  background-color: #e0f2fe !important;
  color: #0369a1 !important;
}

.group-tout {
  background-color: #ffedd5 !important;
  color: #c2410c !important;
}

.group-tin {
  background-color: #dcfce7 !important;
  color: #15803d !important;
}

.group-needs {
  background-color: #fee2e2 !important;
  color: #991b1b !important;
}

.sub-col {
  font-size: 0.7rem !important;
  padding: 0.4rem 0.5rem !important;
  text-align: center !important;
}

.sub-total {
  background-color: #f1f5f9;
  font-weight: 800;
  border-right: 1px solid #cbd5e1;
}

.sub-total-val {
  background-color: #f8fafc;
  border-right: 1px solid #e2e8f0;
}

.sub-total-needs {
  background-color: #fee2e2 !important;
}

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
}

/* Modal Styling */
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

.wide-card {
  max-width: 780px !important;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
}

.modal-card {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
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
  overflow-y: auto;
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

.subjects-entry-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: #1e293b;
  margin-top: 0.5rem;
}

.subject-table-wrap {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.subject-input-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.subject-input-table th {
  background: #f1f5f9;
  padding: 0.5rem 0.75rem;
  text-align: left;
}

.subject-input-table td {
  padding: 0.4rem 0.75rem;
  border-top: 1px solid var(--color-border);
}

.mini-input {
  width: 70px;
  padding: 0.3rem 0.4rem;
  border: 1px solid var(--color-border-dark);
  border-radius: var(--radius-sm);
  text-align: right;
  font-size: 0.82rem;
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
