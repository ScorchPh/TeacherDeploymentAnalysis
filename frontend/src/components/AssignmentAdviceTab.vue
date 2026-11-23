<script setup lang="ts">
import { ref, computed } from 'vue'
import { tnaStore } from '../stores/tnaStore'
import { exportAssignmentAdvicesExcel } from '../utils/excelTemplate'
import {
  type CategoryType,
  type AssignmentAdviceRecord,
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
    currentPosition: 'TEACHER I',
    dateAdded: getTodayDate(),
    subject: '',
    remarks: '',
  }
}
const form = ref(emptyForm())

const categoryRecords = computed(() =>
  tnaStore.assignmentAdviceRecords.filter((a) => a.category === props.category)
)

const schoolOptions = computed(() =>
  tnaStore.getSchoolsForCategory(props.category).map((s) => s.schoolName)
)

const filteredRecords = computed(() => {
  const q = searchQuery.value.toLowerCase().trim()
  return categoryRecords.value.filter((a) => {
    if (schoolFilter.value !== 'ALL' && a.schoolName.toLowerCase() !== schoolFilter.value.toLowerCase()) {
      return false
    }
    if (hasSubject.value && subjectFilter.value !== 'ALL' && a.subject !== subjectFilter.value) {
      return false
    }
    if (!q) return true
    return [
      a.lastName,
      a.firstName,
      a.middleName,
      a.schoolName,
      a.currentPosition,
      a.dateAdded,
      a.subject ?? '',
      a.remarks ?? '',
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

function openAdd() {
  editingId.value = null
  form.value = emptyForm()
  if (hasSubject.value) form.value.subject = subjects.value[0] ?? ''
  formError.value = ''
  isModalOpen.value = true
}

function openEdit(a: AssignmentAdviceRecord) {
  editingId.value = a.id
  form.value = {
    lastName: a.lastName,
    firstName: a.firstName,
    middleName: a.middleName,
    schoolName: a.schoolName,
    currentPosition: a.currentPosition,
    dateAdded: a.dateAdded || getTodayDate(),
    subject: a.subject ?? '',
    remarks: a.remarks ?? '',
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
    formError.value = 'Please select or enter the Assigned School.'
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
    currentPosition: f.currentPosition.trim(),
    dateAdded: f.dateAdded || getTodayDate(),
    subject: hasSubject.value ? f.subject.trim() : undefined,
    remarks: f.remarks.trim() || undefined,
  }

  if (editingId.value) {
    tnaStore.updateAssignmentAdvice(editingId.value, payload)
  } else {
    tnaStore.addAssignmentAdvice(payload)
  }

  isModalOpen.value = false
}

function remove(a: AssignmentAdviceRecord) {
  const fullName = `${a.lastName}, ${a.firstName}`
  const target = hasSubject.value ? `${a.schoolName} (${a.subject})` : a.schoolName
  if (
    confirm(
      `Remove Assignment Advice for "${fullName}" at ${target}?\n\nThis will decrease ${a.schoolName}'s Existing count by 1.`
    )
  ) {
    tnaStore.deleteAssignmentAdvice(a.id)
  }
}

function handleExportExcel() {
  exportAssignmentAdvicesExcel(props.category)
}
</script>

<template>
  <div class="assignment-advice-tab">
    <!-- Top Filter Bar -->
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
        <button class="btn btn-secondary" @click="handleExportExcel" title="Export Assignment Advices to Excel">
          📊 Export Excel
        </button>
        <button class="btn btn-primary" @click="openAdd">
          + Add Assignment Advice
        </button>
      </div>
    </div>

    <!-- Table of Assignment Advices -->
    <div class="table-card">
      <table class="advice-table">
        <thead>
          <tr>
            <th class="col-no">NO.</th>
            <th class="col-name">NAME OF APPLICANT / TEACHER</th>
            <th class="col-school">ASSIGNED SCHOOL</th>
            <th v-if="hasSubject" class="col-subj">SUBJECT / TRACK</th>
            <th class="col-pos">CURRENT POSITION</th>
            <th class="col-date">DATE ASSIGNED</th>
            <th class="col-remarks">REMARKS</th>
            <th class="col-actions">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(a, idx) in filteredRecords" :key="a.id">
            <td class="col-no">{{ idx + 1 }}</td>
            <td class="col-name">
              <div class="name-box">
                <span class="name-last">{{ a.lastName }},</span>
                <span class="name-first">{{ a.firstName }}</span>
                <span v-if="a.middleName" class="name-mid">{{ a.middleName }}</span>
              </div>
            </td>
            <td class="col-school">
              <div class="school-pill">
                <span class="school-icon">🏫</span>
                <span class="school-txt">{{ a.schoolName }}</span>
              </div>
            </td>
            <td v-if="hasSubject" class="col-subj">
              <span class="subj-badge">{{ a.subject || '—' }}</span>
            </td>
            <td class="col-pos">{{ a.currentPosition }}</td>
            <td class="col-date text-muted">{{ formatDate(a.dateAdded) }}</td>
            <td class="col-remarks text-muted">{{ a.remarks || '—' }}</td>
            <td class="col-actions">
              <div class="action-btns">
                <button class="icon-btn edit-btn" title="Edit Advice" @click="openEdit(a)">
                  ✎
                </button>
                <button class="icon-btn delete-btn" title="Remove Advice" @click="remove(a)">
                  🗑
                </button>
              </div>
            </td>
          </tr>
          <tr v-if="filteredRecords.length === 0">
            <td :colspan="hasSubject ? 8 : 7" class="empty-cell">
              <div class="empty-state">
                <span class="empty-icon">📝</span>
                <span class="empty-title">No Assignment Advice records found</span>
                <span class="empty-sub">
                  Click "+ Add Assignment Advice" to deploy a newly hired teacher directly to a school.
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Add / Edit Modal -->
    <div v-if="isModalOpen" class="modal-overlay" @click.self="isModalOpen = false">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <h3 class="modal-title">
              {{ editingId ? 'Edit Assignment Advice' : `Add ${category} Assignment Advice` }}
            </h3>
            <span class="modal-sub">
              Newly deployed teachers directly increase the school's faculty (+1 Existing).
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

          <!-- School & Subject Group -->
          <div class="form-section-title">DEPLOYMENT ASSIGNMENT</div>
          <div class="form-row" :class="hasSubject ? 'form-row-2' : 'form-row-1'">
            <div class="form-group">
              <label class="form-label">Assigned School *</label>
              <input
                v-model="form.schoolName"
                list="assignment-schools-list"
                placeholder="Select or enter assigned school"
                class="form-input"
                required
              />
              <datalist id="assignment-schools-list">
                <option v-for="s in schoolOptions" :key="s" :value="s" />
              </datalist>
              <span v-if="isNewSchool" class="field-hint text-warning">
                ℹ️ "{{ form.schoolName }}" will be added as a monitored school.
              </span>
            </div>

            <div v-if="hasSubject" class="form-group">
              <label class="form-label">Subject / Track *</label>
              <select v-model="form.subject" class="form-input" required>
                <option value="" disabled>Select Subject / Track</option>
                <option v-for="s in subjects" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>
          </div>

          <!-- Position & Date Group -->
          <div class="form-row form-row-2">
            <div class="form-group">
              <label class="form-label">Current Position *</label>
              <select v-model="form.currentPosition" class="form-input" required>
                <option v-for="p in POSITIONS" :key="p" :value="p">{{ p }}</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Date Assigned *</label>
              <input v-model="form.dateAdded" type="date" class="form-input" required />
            </div>
          </div>

          <!-- Remarks -->
          <div class="form-group">
            <label class="form-label">Remarks / Notes (Optional)</label>
            <input
              v-model="form.remarks"
              type="text"
              placeholder="e.g. Special Order No., Plantilla batch, or division notes"
              class="form-input"
            />
          </div>

          <!-- Dynamic Info Alert -->
          <div class="info-alert">
            <span class="info-icon">💡</span>
            <div class="info-txt">
              <strong>Adds +1 Existing:</strong> Saving this assignment will automatically increment
              <strong>{{ form.schoolName || 'the assigned school' }}</strong>'s Existing teacher count by +1,
              lowering the teacher shortage (GAP).
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" @click="isModalOpen = false">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">
              {{ editingId ? 'Update Advice' : 'Add Assignment Advice' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.assignment-advice-tab {
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

.advice-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  text-align: left;
}

.advice-table thead th {
  background: #f8fafc;
  padding: 0.8rem 1rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #475569;
  letter-spacing: 0.04em;
  border-bottom: 2px solid #e2e8f0;
}

.advice-table tbody tr {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.12s ease;
}

.advice-table tbody tr:hover {
  background: #f8fafc;
}

.advice-table td {
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

.name-last {
  color: #1e293b;
}

.school-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  background: #eff6ff;
  color: #1e40af;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.82rem;
  border: 1px solid #dbeafe;
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
  max-width: 200px;
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
  max-width: 640px;
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

.info-alert {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  padding: 0.75rem 0.95rem;
  border-radius: 8px;
  color: #166534;
  font-size: 0.82rem;
  line-height: 1.4;
}

.info-icon {
  font-size: 1.1rem;
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
