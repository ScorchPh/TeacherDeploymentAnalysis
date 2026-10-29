<script setup lang="ts">
import { ref, computed } from 'vue'
import { tnaStore } from '../stores/tnaStore'
import { exportDeploymentsExcel } from '../utils/excelTemplate'
import {
  JHS_SUBJECTS,
  SHS_SUBJECTS,
  type CategoryType,
  type DeploymentRecord,
  type TransferType,
} from '../types/tna'

const props = defineProps<{
  category: CategoryType
}>()

const POSITIONS = [
  'TEACHER I',
  'TEACHER II',
  'TEACHER III',
  'MASTER TEACHER I',
  'MASTER TEACHER II',
]

const hasSubject = computed(() => props.category !== 'ES')
const subjects = computed<string[]>(() =>
  props.category === 'JHS' ? JHS_SUBJECTS : props.category === 'SHS' ? SHS_SUBJECTS : []
)

const searchQuery = ref('')
const typeFilter = ref<'ALL' | TransferType>('ALL')
const subjectFilter = ref('ALL')

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const formError = ref('')

function getTodayDate(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return '—'
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return dateStr
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function emptyForm() {
  return {
    lastName: '',
    firstName: '',
    middleName: '',
    schoolName: '',
    toSchoolName: '',
    currentPosition: 'TEACHER I',
    dateAdded: getTodayDate(),
    transferType: 'IN' as TransferType,
    subject: '',
  }
}
const form = ref(emptyForm())

const categoryRecords = computed(() =>
  tnaStore.deploymentRecords.filter((d) => d.category === props.category)
)

const filteredRecords = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return categoryRecords.value.filter((d) => {
    if (typeFilter.value !== 'ALL' && d.transferType !== typeFilter.value) return false
    if (hasSubject.value && subjectFilter.value !== 'ALL' && d.subject !== subjectFilter.value)
      return false
    if (!q) return true
    return [
      d.lastName,
      d.firstName,
      d.middleName,
      d.schoolName,
      d.toSchoolName ?? '',
      d.currentPosition,
      d.dateAdded,
      d.subject ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const countIn = computed(() => categoryRecords.value.filter((d) => d.transferType === 'IN').length)
const countOut = computed(() => categoryRecords.value.filter((d) => d.transferType === 'OUT').length)

const schoolOptions = computed(() =>
  tnaStore.getSchoolsForCategory(props.category).map((s) => s.schoolName)
)

const isNewSchool = computed(() => {
  const name = form.value.schoolName.trim().toLowerCase()
  return !!name && !schoolOptions.value.some((s) => s.trim().toLowerCase() === name)
})

const isNewToSchool = computed(() => {
  if (form.value.transferType !== 'OUT') return false
  const name = form.value.toSchoolName.trim().toLowerCase()
  return !!name && !schoolOptions.value.some((s) => s.trim().toLowerCase() === name)
})

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  if (hasSubject.value) form.value.subject = subjects.value[0] ?? ''
  formError.value = ''
  isModalOpen.value = true
}

function openEdit(d: DeploymentRecord) {
  editingId.value = d.id
  form.value = {
    lastName: d.lastName,
    firstName: d.firstName,
    middleName: d.middleName,
    schoolName: d.schoolName,
    toSchoolName: d.toSchoolName ?? '',
    currentPosition: d.currentPosition,
    dateAdded: d.dateAdded || getTodayDate(),
    transferType: d.transferType,
    subject: d.subject ?? '',
  }
  formError.value = ''
  isModalOpen.value = true
}

function save() {
  const f = form.value
  if (!f.lastName.trim() || !f.firstName.trim()) {
    formError.value = 'Last Name and First Name are required.'
    return
  }
  if (!f.schoolName.trim()) {
    formError.value = f.transferType === 'OUT' ? 'From School is required.' : 'School is required.'
    return
  }
  if (f.transferType === 'OUT') {
    if (!f.toSchoolName.trim()) {
      formError.value = 'To School (Transfer In destination) is required.'
      return
    }
    if (f.schoolName.trim().toLowerCase() === f.toSchoolName.trim().toLowerCase()) {
      formError.value = 'From School and To School cannot be the same school.'
      return
    }
  }
  if (hasSubject.value && !f.subject) {
    formError.value = 'Please select a subject.'
    return
  }

  const payload = {
    category: props.category,
    lastName: f.lastName.trim(),
    firstName: f.firstName.trim(),
    middleName: f.middleName.trim(),
    schoolName: f.schoolName.trim(),
    toSchoolName: f.transferType === 'OUT' ? f.toSchoolName.trim() : undefined,
    currentPosition: f.currentPosition.trim(),
    dateAdded: f.dateAdded || getTodayDate(),
    transferType: f.transferType,
    subject: hasSubject.value ? (f.subject as DeploymentRecord['subject']) : undefined,
  }

  if (editingId.value) tnaStore.updateDeployment(editingId.value, payload)
  else tnaStore.addDeployment(payload)

  isModalOpen.value = false
}

function remove(d: DeploymentRecord) {
  if (confirm(`Remove deployment record of "${d.firstName} ${d.lastName}"?`)) {
    tnaStore.deleteDeployment(d.id)
  }
}
</script>

<template>
  <div class="deployment-tab">
    <!-- Toolbar -->
    <div class="toolbar-box">
      <div class="toolbar-left">
        <div class="search-input-wrap">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search name, school, position, date..."
            class="search-input"
          />
          <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
        </div>

        <div class="filter-group">
          <button class="filter-pill" :class="{ active: typeFilter === 'ALL' }" @click="typeFilter = 'ALL'">
            All ({{ categoryRecords.length }})
          </button>
          <button class="filter-pill pill-in" :class="{ active: typeFilter === 'IN' }" @click="typeFilter = 'IN'">
            Transfer In ({{ countIn }})
          </button>
          <button class="filter-pill pill-out" :class="{ active: typeFilter === 'OUT' }" @click="typeFilter = 'OUT'">
            Transfer Out ({{ countOut }})
          </button>
        </div>

        <div v-if="hasSubject" class="subject-select-wrap">
          <label>Subject:</label>
          <select v-model="subjectFilter" class="subject-select">
            <option value="ALL">All Subjects</option>
            <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
          </select>
        </div>
      </div>

      <div class="toolbar-right">
        <button class="btn btn-secondary" title="Download Excel backup of deployment records" @click="exportDeploymentsExcel(category)">
          💾 Export Excel
        </button>
        <button class="btn btn-primary" @click="openAdd">➕ Add Deployment</button>
      </div>
    </div>

    <!-- Table -->
    <div class="table-container">
      <div class="table-responsive">
        <table class="deploy-table">
          <thead>
            <tr>
              <th rowspan="2" class="col-no">No.</th>
              <th colspan="3" class="group-head">Name of Applicant</th>
              <th rowspan="2">School</th>
              <th v-if="hasSubject" rowspan="2">Subject</th>
              <th rowspan="2">Current Position</th>
              <th rowspan="2">Date Added</th>
              <th rowspan="2" class="col-center">Transfer</th>
              <th rowspan="2" class="col-center">Actions</th>
            </tr>
            <tr>
              <th class="sub-head">Last Name</th>
              <th class="sub-head">First Name</th>
              <th class="sub-head">Middle Name</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(d, i) in filteredRecords" :key="d.id">
              <td class="col-no">{{ i + 1 }}</td>
              <td class="font-bold">{{ d.lastName }}</td>
              <td>{{ d.firstName }}</td>
              <td>{{ d.middleName || '—' }}</td>
              <td class="font-semibold">
                <template v-if="d.transferType === 'OUT' && d.toSchoolName">
                  <div class="school-route">
                    <span class="school-from" title="Transferred Out From">{{ d.schoolName }}</span>
                    <span class="route-arrow">→</span>
                    <span class="school-to" title="Transferred In To">{{ d.toSchoolName }}</span>
                  </div>
                </template>
                <template v-else>
                  {{ d.schoolName }}
                </template>
              </td>
              <td v-if="hasSubject"><span class="subject-chip">{{ d.subject || '—' }}</span></td>
              <td>{{ d.currentPosition || '—' }}</td>
              <td class="text-muted">{{ formatDate(d.dateAdded) }}</td>
              <td class="col-center">
                <span class="badge" :class="d.transferType === 'IN' ? 'badge-in' : 'badge-out'">
                  {{ d.transferType === 'IN' ? '⬇ Transfer In' : '⬆ Transfer Out' }}
                </span>
              </td>
              <td class="col-center">
                <div class="actions-wrap">
                  <button class="action-btn" title="Edit" @click="openEdit(d)">✏️</button>
                  <button class="action-btn delete" title="Delete" @click="remove(d)">🗑️</button>
                </div>
              </td>
            </tr>
            <tr v-if="filteredRecords.length === 0">
              <td :colspan="hasSubject ? 10 : 9" class="empty-row">
                {{
                  categoryRecords.length === 0
                    ? `No ${category} deployment records yet. Click "Add Deployment" to start.`
                    : 'No records match your search or filter.'
                }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ editingId ? 'Edit' : 'Add' }} {{ category }} Deployment</h3>
          <button class="close-x" @click="isModalOpen = false">✕</button>
        </div>

        <div class="modal-content">
          <!-- Transfer type toggle -->
          <div class="form-group">
            <label>Transfer Type *</label>
            <div class="type-toggle">
              <button
                type="button"
                class="toggle-btn toggle-in"
                :class="{ active: form.transferType === 'IN' }"
                @click="form.transferType = 'IN'"
              >
                ⬇ Transfer In
              </button>
              <button
                type="button"
                class="toggle-btn toggle-out"
                :class="{ active: form.transferType === 'OUT' }"
                @click="form.transferType = 'OUT'"
              >
                ⬆ Transfer Out
              </button>
            </div>
          </div>

          <div class="section-label">Name of Applicant</div>
          <div class="form-grid-3">
            <div class="form-group">
              <label>Last Name *</label>
              <input v-model="form.lastName" type="text" class="form-input" placeholder="e.g. Dela Cruz" />
            </div>
            <div class="form-group">
              <label>First Name *</label>
              <input v-model="form.firstName" type="text" class="form-input" placeholder="e.g. Juan" />
            </div>
            <div class="form-group">
              <label>Middle Name</label>
              <input v-model="form.middleName" type="text" class="form-input" placeholder="e.g. Santos" />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-2">
              <label>{{ form.transferType === 'OUT' ? 'From School (Transfer Out) *' : 'School (Transfer In) *' }}</label>
              <input
                v-model="form.schoolName"
                type="text"
                class="form-input"
                :list="`deploy-schools-${category}`"
                :placeholder="form.transferType === 'OUT' ? 'School transferring out from' : 'Type or pick a school'"
              />
              <datalist :id="`deploy-schools-${category}`">
                <option v-for="s in schoolOptions" :key="s" :value="s" />
              </datalist>
              <span v-if="isNewSchool" class="hint hint-new">
                New school — it will be added to the {{ category }} Analysis table.
              </span>
            </div>

            <div v-if="form.transferType === 'OUT'" class="form-group flex-2">
              <label>To School (Transfer In) *</label>
              <input
                v-model="form.toSchoolName"
                type="text"
                class="form-input"
                :list="`deploy-schools-${category}`"
                placeholder="Destination school transferring in to"
              />
              <span v-if="isNewToSchool" class="hint hint-new">
                New school — it will be added to the {{ category }} Analysis table.
              </span>
            </div>

            <div v-if="hasSubject" class="form-group">
              <label>Subject *</label>
              <select v-model="form.subject" class="form-input">
                <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Current Position</label>
              <input v-model="form.currentPosition" type="text" class="form-input" list="deploy-positions" />
              <datalist id="deploy-positions">
                <option v-for="p in POSITIONS" :key="p" :value="p" />
              </datalist>
            </div>
            <div class="form-group">
              <label>Date Added</label>
              <input v-model="form.dateAdded" type="date" class="form-input" />
            </div>
          </div>

          <div class="effect-preview" :class="form.transferType === 'IN' ? 'effect-in' : 'effect-out'">
            <template v-if="form.transferType === 'IN'">
              This adds <strong>+1 Transfer In</strong> to
              <strong>{{ form.schoolName.trim() || 'the selected school' }}</strong>
              <template v-if="hasSubject && form.subject"> for <strong>{{ form.subject }}</strong></template>.
            </template>
            <template v-else>
              This adds <strong>+1 Transfer Out</strong> to
              <strong>{{ form.schoolName.trim() || 'From School' }}</strong> and
              <strong>+1 Transfer In</strong> to
              <strong>{{ form.toSchoolName.trim() || 'To School' }}</strong>
              <template v-if="hasSubject && form.subject"> for <strong>{{ form.subject }}</strong></template>.
            </template>
          </div>

          <div v-if="formError" class="form-error">{{ formError }}</div>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="isModalOpen = false">Cancel</button>
          <button class="btn btn-primary" @click="save">
            {{ editingId ? 'Save Changes' : 'Add Deployment' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.deployment-tab {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
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
  flex-wrap: wrap;
}
.toolbar-left,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}
.search-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 0.65rem;
  font-size: 0.8rem;
  opacity: 0.6;
}
.search-input {
  padding: 0.5rem 2rem 0.5rem 2rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
  width: 280px;
  outline: none;
}
.search-input:focus {
  border-color: var(--color-primary);
}
.clear-btn {
  position: absolute;
  right: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  color: #94a3b8;
}
.filter-group {
  display: flex;
  background: #f1f5f9;
  border-radius: var(--radius-md);
  padding: 0.2rem;
  gap: 0.15rem;
}
.filter-pill {
  border: none;
  background: transparent;
  padding: 0.35rem 0.75rem;
  border-radius: 6px;
  font-size: 0.78rem;
  font-weight: 600;
  color: #475569;
  cursor: pointer;
}
.filter-pill.active {
  background: #ffffff;
  color: #0f172a;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}
.filter-pill.pill-in.active {
  color: #047857;
}
.filter-pill.pill-out.active {
  color: #c2410c;
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
  padding: 0.4rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.8rem;
}

/* Buttons */
.btn {
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
}
.btn-primary {
  background: var(--color-primary);
  color: #fff;
}
.btn-primary:hover {
  filter: brightness(1.08);
}
.btn-secondary {
  background: #fff;
  border-color: var(--color-border);
  color: #334155;
}

/* Table */
.table-container {
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}
.table-responsive {
  overflow-x: auto;
}
.deploy-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}
.deploy-table th {
  background: #f8fafc;
  color: #334155;
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  padding: 0.6rem 0.85rem;
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  white-space: nowrap;
}
.deploy-table th.group-head {
  text-align: center;
  background: #eef2ff;
  border-bottom: 1px solid #c7d2fe;
}
.deploy-table th.sub-head {
  background: #f5f7ff;
}
.deploy-table td {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid #f1f5f9;
  color: #1e293b;
}
.deploy-table tbody tr:hover {
  background: #f8fafc;
}
.col-no {
  width: 48px;
  text-align: center;
  color: #64748b;
}
.col-center {
  text-align: center !important;
}
.font-bold {
  font-weight: 700;
}
.font-semibold {
  font-weight: 600;
}
.text-muted {
  color: #64748b;
}
.school-route {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.school-from {
  color: #c2410c;
  background: #fff7ed;
  border: 1px solid #fed7aa;
  padding: 0.1rem 0.45rem;
  border-radius: 6px;
  font-size: 0.8rem;
}
.route-arrow {
  color: #64748b;
  font-weight: 700;
}
.school-to {
  color: #047857;
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  padding: 0.1rem 0.45rem;
  border-radius: 6px;
  font-size: 0.8rem;
}
.subject-chip {
  background: #eef2ff;
  color: #4338ca;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
}
.badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-size: 0.74rem;
  font-weight: 700;
  white-space: nowrap;
}
.badge-in {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}
.badge-out {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}
.actions-wrap {
  display: flex;
  justify-content: center;
  gap: 0.25rem;
}
.action-btn {
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0.25rem 0.4rem;
  border-radius: 6px;
}
.action-btn:hover {
  background: #f1f5f9;
}
.action-btn.delete:hover {
  background: #fee2e2;
}
.empty-row {
  text-align: center;
  padding: 2.5rem 1rem !important;
  color: #94a3b8;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal-card {
  background: #fff;
  border-radius: 12px;
  width: 640px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--color-border);
}
.modal-header h3 {
  margin: 0;
  font-size: 1.05rem;
}
.close-x {
  border: none;
  background: none;
  font-size: 1rem;
  cursor: pointer;
  color: #64748b;
}
.modal-content {
  padding: 1.25rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.9rem 1.25rem;
  border-top: 1px solid var(--color-border);
}
.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: -0.4rem;
}
.form-grid-3 {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
}
.form-row {
  display: flex;
  gap: 0.75rem;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  flex: 1;
}
.flex-2 {
  flex: 2;
}
.form-group label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #334155;
}
.form-input {
  padding: 0.5rem 0.65rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  font-size: 0.85rem;
  outline: none;
}
.form-input:focus {
  border-color: var(--color-primary);
}
.hint {
  font-size: 0.72rem;
}
.hint-new {
  color: #b45309;
}
.type-toggle {
  display: flex;
  gap: 0.5rem;
}
.toggle-btn {
  flex: 1;
  padding: 0.6rem;
  border-radius: 8px;
  border: 2px solid var(--color-border);
  background: #fff;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  color: #64748b;
}
.toggle-in.active {
  border-color: #10b981;
  background: #ecfdf5;
  color: #047857;
}
.toggle-out.active {
  border-color: #f97316;
  background: #fff7ed;
  color: #c2410c;
}
.effect-preview {
  font-size: 0.82rem;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
}
.effect-in {
  background: #ecfdf5;
  color: #065f46;
}
.effect-out {
  background: #fff7ed;
  color: #9a3412;
}
.form-error {
  color: #b91c1c;
  font-size: 0.8rem;
  font-weight: 600;
}
</style>

