<script setup lang="ts">
import { ref, computed } from 'vue'
import { tnaStore } from '../stores/tnaStore'
import { exportTransfersExcel } from '../utils/excelTemplate'
import {
  type CategoryType,
  type DeploymentRecord,
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
  'SPECIAL EDUCATION TEACHER I',
  'SPECIAL EDUCATION TEACHER II',
  'HEAD TEACHER I',
]

const hasSubject = computed(() => props.category !== 'ES')
const subjects = computed<string[]>(() =>
  props.category === 'JHS'
    ? tnaStore.jhsSubjects
    : props.category === 'SHS'
    ? tnaStore.shsSubjects
    : []
)

const searchQuery = ref('')
const subjectFilter = ref('ALL')
const schoolFilter = ref('ALL')

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
    subject: '',
    remarks: '',
  }
}
const form = ref(emptyForm())

const categoryRecords = computed(() =>
  tnaStore.deploymentRecords.filter((d) => d.category === props.category)
)

const schoolOptions = computed(() =>
  tnaStore.getSchoolsForCategory(props.category).map((s) => s.schoolName)
)

const filteredRecords = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return categoryRecords.value.filter((d) => {
    if (schoolFilter.value !== 'ALL') {
      const matchSchool =
        d.schoolName.toLowerCase() === schoolFilter.value.toLowerCase() ||
        (d.toSchoolName && d.toSchoolName.toLowerCase() === schoolFilter.value.toLowerCase())
      if (!matchSchool) return false
    }
    if (hasSubject.value && subjectFilter.value !== 'ALL' && d.subject !== subjectFilter.value) {
      return false
    }
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
      d.remarks ?? '',
    ]
      .join(' ')
      .toLowerCase()
      .includes(q)
  })
})

const isNewSchool = computed(() => {
  const name = form.value.schoolName.trim().toLowerCase()
  return !!name && !schoolOptions.value.some((s) => s.trim().toLowerCase() === name)
})

const isNewToSchool = computed(() => {
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
    subject: d.subject ?? '',
    remarks: d.remarks ?? '',
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
    formError.value = 'From School (Releasing) is required.'
    return
  }
  if (!f.toSchoolName.trim()) {
    formError.value = 'To School (Receiving) is required.'
    return
  }
  if (f.schoolName.trim().toLowerCase() === f.toSchoolName.trim().toLowerCase()) {
    formError.value = 'From School and To School cannot be the same school.'
    return
  }
  if (hasSubject.value && !f.subject.trim()) {
    formError.value = 'Subject / Specialization is required.'
    return
  }

  const payload = {
    category: props.category,
    lastName: f.lastName.trim().toUpperCase(),
    firstName: f.firstName.trim().toUpperCase(),
    middleName: f.middleName.trim().toUpperCase(),
    schoolName: f.schoolName.trim(),
    toSchoolName: f.toSchoolName.trim(),
    currentPosition: f.currentPosition.trim(),
    dateAdded: f.dateAdded || getTodayDate(),
    transferType: 'OUT' as const,
    subject: hasSubject.value ? f.subject.trim() : undefined,
    remarks: f.remarks.trim() || undefined,
  }

  if (editingId.value) {
    tnaStore.updateDeployment(editingId.value, payload)
  } else {
    tnaStore.addDeployment(payload)
  }

  isModalOpen.value = false
}

function remove(d: DeploymentRecord) {
  const fullName = `${d.lastName}, ${d.firstName}`
  if (
    confirm(
      `Remove transfer record for "${fullName}" (${d.schoolName} ➔ ${d.toSchoolName})?\n\nThis will adjust both schools' Transfer Out and Transfer In counts.`
    )
  ) {
    tnaStore.deleteDeployment(d.id)
  }
}

function handleExportExcel() {
  exportTransfersExcel(props.category)
}
</script>

<template>
  <div class="transfers-tab">
    <!-- Toolbar -->
    <div class="tab-toolbar">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search name, school, position, remarks..."
          class="search-input"
        />
        <button
          v-if="searchQuery"
          class="search-clear"
          title="Clear search"
          @click="searchQuery = ''"
        >
          ✕
        </button>
      </div>

      <!-- School Filter -->
      <div class="filter-item">
        <label class="filter-lbl">School:</label>
        <select v-model="schoolFilter" class="select-input">
          <option value="ALL">All Schools ({{ categoryRecords.length }})</option>
          <option v-for="s in schoolOptions" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <!-- Subject Filter (JHS & SHS only) -->
      <div v-if="hasSubject" class="filter-item">
        <label class="filter-lbl">Subject:</label>
        <select v-model="subjectFilter" class="select-input">
          <option value="ALL">All Subjects</option>
          <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>

      <div class="toolbar-actions">
        <button class="btn btn-secondary" @click="handleExportExcel" title="Export Transfers to Excel">
          📊 Export Transfers
        </button>
        <button class="btn btn-primary" @click="openAdd">
          🔄 Record Transfer
        </button>
      </div>
    </div>

    <!-- Transfers Table -->
    <div class="table-card">
      <table class="transfers-table">
        <thead>
          <tr>
            <th class="col-no">NO.</th>
            <th class="col-name">NAME OF TEACHER</th>
            <th class="col-from">FROM SCHOOL (RELEASED)</th>
            <th class="col-arrow"></th>
            <th class="col-to">TO SCHOOL (RECEIVED)</th>
            <th v-if="hasSubject" class="col-subj">SUBJECT / TRACK</th>
            <th class="col-pos">POSITION</th>
            <th class="col-date">DATE EFFECTIVE</th>
            <th class="col-remarks">REMARKS</th>
            <th class="col-actions">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(d, idx) in filteredRecords" :key="d.id">
            <td class="col-no">{{ idx + 1 }}</td>
            <td class="col-name">
              <div class="name-box">
                <span class="name-last">{{ d.lastName }},</span>
                <span class="name-first">{{ d.firstName }}</span>
                <span v-if="d.middleName" class="name-mid">{{ d.middleName }}</span>
              </div>
            </td>
            <td class="col-from">
              <div class="school-tag tag-out" title="Releasing School (+1 Transfer Out)">
                <span class="tag-badge">OUT</span>
                <span class="tag-name">{{ d.schoolName }}</span>
              </div>
            </td>
            <td class="col-arrow">➔</td>
            <td class="col-to">
              <div class="school-tag tag-in" title="Receiving School (+1 Transfer In)">
                <span class="tag-badge">IN</span>
                <span class="tag-name">{{ d.toSchoolName || '—' }}</span>
              </div>
            </td>
            <td v-if="hasSubject" class="col-subj">
              <span class="subj-badge">{{ d.subject || '—' }}</span>
            </td>
            <td class="col-pos">{{ d.currentPosition }}</td>
            <td class="col-date text-muted">{{ formatDate(d.dateAdded) }}</td>
            <td class="col-remarks text-muted">{{ d.remarks || '—' }}</td>
            <td class="col-actions">
              <div class="action-btns">
                <button class="icon-btn edit-btn" title="Edit Transfer" @click="openEdit(d)">
                  ✎
                </button>
                <button class="icon-btn delete-btn" title="Remove Transfer" @click="remove(d)">
                  🗑
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredRecords.length === 0">
            <td :colspan="hasSubject ? 10 : 9" class="empty-cell">
              <div class="empty-state">
                <span class="empty-icon">🔄</span>
                <span class="empty-title">No Teacher Transfer records found</span>
                <span class="empty-sub">
                  Click "Record Transfer" to register a faculty movement between two schools.
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Record Transfer Modal -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <h3 class="modal-title">
              {{ editingId ? 'Edit Teacher Transfer' : `Record ${category} Teacher Transfer` }}
            </h3>
            <span class="modal-sub">
              Transfers record movement from a releasing school to a receiving destination school.
            </span>
          </div>
          <button class="close-btn" @click="isModalOpen = false">✕</button>
        </div>

        <form class="modal-body" @submit.prevent="save">
          <div v-if="formError" class="form-error-banner">
            ⚠️ {{ formError }}
          </div>

          <!-- Name Group -->
          <div class="form-section-title">TEACHER IDENTIFICATION</div>
          <div class="form-row form-row-3">
            <div class="form-group">
              <label class="form-label">Last Name *</label>
              <input
                v-model="form.lastName"
                type="text"
                placeholder="e.g. Dela Cruz"
                class="form-input text-uppercase"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">First Name *</label>
              <input
                v-model="form.firstName"
                type="text"
                placeholder="e.g. Juan"
                class="form-input text-uppercase"
                required
              />
            </div>
            <div class="form-group">
              <label class="form-label">Middle Name</label>
              <input
                v-model="form.middleName"
                type="text"
                placeholder="e.g. Santos"
                class="form-input text-uppercase"
              />
            </div>
          </div>

          <!-- Transfer Route Group -->
          <div class="form-section-title">TRANSFER ROUTE (BETWEEN SCHOOLS)</div>
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">
                From School (Releasing Faculty) *
                <span class="badge-mini out-mini">+1 Transfer Out</span>
              </label>
              <input
                v-model="form.schoolName"
                :list="`from-schools-${category}`"
                placeholder="Origin / Releasing school"
                class="form-input"
                required
              />
              <datalist :id="`from-schools-${category}`">
                <option v-for="s in schoolOptions" :key="s" :value="s" />
              </datalist>
              <span v-if="isNewSchool" class="field-hint text-warning">
                ℹ️ "{{ form.schoolName }}" will be added as a monitored school.
              </span>
            </div>

            <div class="form-group">
              <label class="form-label">
                To School (Receiving Faculty) *
                <span class="badge-mini in-mini">+1 Transfer In</span>
              </label>
              <input
                v-model="form.toSchoolName"
                :list="`to-schools-${category}`"
                placeholder="Destination / Receiving school"
                class="form-input"
                required
              />
              <datalist :id="`to-schools-${category}`">
                <option v-for="s in schoolOptions" :key="s" :value="s" />
              </datalist>
              <span v-if="isNewToSchool" class="field-hint text-warning">
                ℹ️ "{{ form.toSchoolName }}" will be added as a monitored school.
              </span>
            </div>
          </div>

          <!-- Subject & Position -->
          <div class="form-row" :class="hasSubject ? 'form-row-2' : 'form-row-1'">
            <div v-if="hasSubject" class="form-group">
              <label class="form-label">Subject / Track Specialization *</label>
              <select v-model="form.subject" class="form-input" required>
                <option value="" disabled>Select Subject</option>
                <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Current Position *</label>
              <select v-model="form.currentPosition" class="form-input" required>
                <option v-for="p in POSITIONS" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>
          </div>

          <!-- Date & Remarks -->
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">Date Effective / Added *</label>
              <input v-model="form.dateAdded" type="date" class="form-input" required />
            </div>

            <div class="form-group">
              <label class="form-label">Remarks / Transfer Reason</label>
              <input
                v-model="form.remarks"
                type="text"
                placeholder="e.g. Division deployment order, reassignment"
                class="form-input"
              />
            </div>
          </div>

          <!-- Dynamic Transfer Effect Notice -->
          <div class="transfer-effect-alert">
            <span class="effect-icon">🔄</span>
            <div class="effect-txt">
              This transfer adds <strong>+1 Transfer Out</strong> to
              <span class="highlight-school">{{ form.schoolName || 'From School' }}</span>
              and <strong>+1 Transfer In</strong> to
              <span class="highlight-school">{{ form.toSchoolName || 'To School' }}</span>
              <template v-if="hasSubject && form.subject">
                for subject <strong>{{ form.subject }}</strong>
              </template>.
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isModalOpen = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editingId ? 'Update Transfer' : 'Confirm & Record Transfer' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.transfers-tab {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.tab-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  background: #ffffff;
  padding: 0.85rem 1.15rem;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.search-box {
  position: relative;
  flex: 1 1 240px;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.85rem;
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  padding: 0.55rem 2rem 0.55rem 2.25rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #0f172a;
  background: #f8fafc;
  transition: all 0.15s ease;
}

.search-input:focus {
  outline: none;
  border-color: #2563eb;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.search-clear {
  position: absolute;
  right: 0.65rem;
  background: none;
  border: none;
  color: #94a3b8;
  font-size: 0.8rem;
  cursor: pointer;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.filter-lbl {
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.select-input {
  padding: 0.52rem 1.8rem 0.52rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  color: #1e293b;
  background: #f8fafc;
  cursor: pointer;
}

.select-input:focus {
  outline: none;
  border-color: #2563eb;
  background: #ffffff;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.55rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  border: none;
}

.btn-primary {
  background: #1e40af;
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(30, 64, 175, 0.2);
}

.btn-primary:hover {
  background: #1d4ed8;
}

.btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
}

.btn-secondary:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.table-card {
  background: #ffffff;
  border-radius: 12px;
  border: 1px solid #e2e8f0;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.transfers-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: left;
}

.transfers-table thead th {
  background: #f8fafc;
  padding: 0.8rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.04em;
  border-bottom: 2px solid #e2e8f0;
}

.transfers-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.12s ease;
}

.transfers-table tbody tr:hover {
  background: #f8fafc;
}

.transfers-table td {
  padding: 0.75rem 1rem;
  vertical-align: middle;
}

.col-no {
  width: 48px;
  font-weight: 600;
  color: #94a3b8;
  text-align: center;
}

.name-box {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-weight: 600;
  color: #0f172a;
}

.school-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.82rem;
  font-weight: 600;
}

.tag-out {
  background: #fff7ed;
  color: #c2410c;
  border: 1px solid #fed7aa;
}

.tag-in {
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #bfdbfe;
}

.tag-badge {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.tag-out .tag-badge {
  background: #fdba74;
  color: #7c2d12;
}

.tag-in .tag-badge {
  background: #93c5fd;
  color: #1e3a8a;
}

.col-arrow {
  width: 28px;
  text-align: center;
  color: #94a3b8;
  font-weight: 700;
}

.subj-badge {
  display: inline-block;
  background: #f0fdf4;
  color: #166534;
  border: 1px solid #bbf7d0;
  padding: 0.2rem 0.55rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.78rem;
}

.col-pos {
  font-weight: 500;
  color: #334155;
}

.col-date {
  font-size: 0.82rem;
}

.col-remarks {
  font-size: 0.82rem;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.text-muted {
  color: #64748b;
}

.action-btns {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.icon-btn {
  background: none;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.edit-btn {
  color: #2563eb;
}

.edit-btn:hover {
  background: #eff6ff;
  border-color: #bfdbfe;
}

.delete-btn {
  color: #dc2626;
}

.delete-btn:hover {
  background: #fef2f2;
  border-color: #fecaca;
}

.empty-cell {
  padding: 3.5rem 1rem !important;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.empty-icon {
  font-size: 2.2rem;
}

.empty-title {
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
}

.empty-sub {
  font-size: 0.85rem;
  color: #64748b;
  max-width: 400px;
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background: #ffffff;
  border-radius: 16px;
  width: 100%;
  max-width: 660px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: modalPop 0.18s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(8px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background: #f8fafc;
}

.modal-title-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.modal-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: #0f172a;
}

.modal-sub {
  font-size: 0.8rem;
  color: #64748b;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.2rem;
  color: #94a3b8;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
}

.close-btn:hover {
  background: #e2e8f0;
  color: #0f172a;
}

.modal-body {
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
  max-height: 80vh;
  overflow-y: auto;
}

.form-section-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #64748b;
  letter-spacing: 0.05em;
  padding-bottom: 0.35rem;
  border-bottom: 1px solid #f1f5f9;
  margin-top: 0.25rem;
}

.form-row {
  display: grid;
  gap: 0.85rem;
}

.form-row-3 {
  grid-template-columns: repeat(3, 1fr);
}

.form-row-2 {
  grid-template-columns: repeat(2, 1fr);
}

.form-row-1 {
  grid-template-columns: 1fr;
}

@media (max-width: 600px) {
  .form-row-3,
  .form-row-2 {
    grid-template-columns: 1fr;
  }
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.form-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: #334155;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.badge-mini {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.out-mini {
  background: #ffedd5;
  color: #c2410c;
}

.in-mini {
  background: #dbeafe;
  color: #1e40af;
}

.form-input {
  padding: 0.55rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  color: #0f172a;
  background: #ffffff;
  transition: all 0.15s ease;
}

.form-input:focus {
  outline: none;
  border-color: #2563eb;
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.12);
}

.text-uppercase {
  text-transform: uppercase;
}

.field-hint {
  font-size: 0.75rem;
  margin-top: 0.2rem;
}

.text-warning {
  color: #b45309;
}

.form-error-banner {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
}

.transfer-effect-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  background: #fffbeb;
  border: 1px solid #fde68a;
  padding: 0.75rem 0.95rem;
  border-radius: 8px;
  color: #92400e;
  font-size: 0.82rem;
  line-height: 1.4;
}

.effect-icon {
  font-size: 1.1rem;
}

.highlight-school {
  font-weight: 700;
  color: #78350f;
  text-decoration: underline;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  padding-top: 0.5rem;
  border-top: 1px solid #f1f5f9;
}
</style>
