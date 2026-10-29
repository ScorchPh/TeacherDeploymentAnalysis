<script setup lang="ts">
import { ref } from 'vue'
import * as XLSX from 'xlsx'

const props = defineProps<{
  category: 'ES' | 'JHS' | 'SHS'
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'import', data: any[]): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const previewRows = ref<any[]>([])
const parsedCount = ref(0)
const errorMessage = ref('')
const isProcessing = ref(false)

function handleFileChange(event: Event) {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    parseFile(target.files[0])
  }
}

function handleDrop(event: DragEvent) {
  event.preventDefault()
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    parseFile(event.dataTransfer.files[0])
  }
}

async function parseFile(file: File) {
  errorMessage.value = ''
  selectedFile.value = file
  isProcessing.value = true

  try {
    const data = await file.arrayBuffer()
    const workbook = XLSX.read(data, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) {
      errorMessage.value = 'No sheets found in workbook.'
      isProcessing.value = false
      return
    }
    const worksheet = workbook.Sheets[sheetName]
    if (!worksheet) {
      errorMessage.value = 'The selected worksheet could not be read.'
      isProcessing.value = false
      return
    }
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

    if (!jsonData || jsonData.length < 2) {
      errorMessage.value = 'The selected file is empty or missing data rows.'
      isProcessing.value = false
      return
    }

    // Header matching (case-insensitive and trimmed)
    const rawHeaders = (jsonData[0] || []).map(h => String(h || '').trim().toLowerCase())
    
    // Find column indexes
    const schoolNameIdx = rawHeaders.findIndex(h => h.includes('school') && (h.includes('name') || !h.includes('id')))
    const schoolIdIdx = rawHeaders.findIndex(h => h.includes('id') || h.includes('school id'))
    const reqIdx = rawHeaders.findIndex(h => h.includes('req') || h.includes('required'))
    const existIdx = rawHeaders.findIndex(h => h.includes('exist') || h.includes('existing'))
    const tOutIdx = rawHeaders.findIndex(h => h.includes('out') || h.includes('t-out') || h.includes('transfer out'))
    const tInIdx = rawHeaders.findIndex(h => h.includes('in') || h.includes('t-in') || h.includes('transfer in'))

    const parsed: any[] = []

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i]
      if (!row || row.length === 0) continue

      const sName = schoolNameIdx !== -1 ? String(row[schoolNameIdx] || '').trim() : String(row[1] || '').trim()
      const sId = schoolIdIdx !== -1 ? String(row[schoolIdIdx] || '').trim() : String(row[0] || '').trim()

      if (!sName && !sId) continue

      parsed.push({
        schoolId: sId,
        schoolName: sName,
        required: reqIdx !== -1 ? Number(row[reqIdx]) || 0 : Number(row[2]) || 0,
        existing: existIdx !== -1 ? Number(row[existIdx]) || 0 : Number(row[3]) || 0,
        transferOut: tOutIdx !== -1 ? Number(row[tOutIdx]) || 0 : Number(row[4]) || 0,
        transferIn: tInIdx !== -1 ? Number(row[tInIdx]) || 0 : Number(row[5]) || 0,
      })
    }

    parsedCount.value = parsed.length
    previewRows.value = parsed.slice(0, 5)
  } catch (err: any) {
    errorMessage.value = `Error parsing file: ${err.message || 'Invalid Excel or CSV file'}`
  } finally {
    isProcessing.value = false
  }
}

function confirmImport() {
  if (selectedFile.value && previewRows.value.length > 0) {
    // Re-run parse to get full list
    const file = selectedFile.value
    file.arrayBuffer().then(data => {
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetName = workbook.SheetNames[0]
      if (!sheetName) return
      const worksheet = workbook.Sheets[sheetName]
      if (!worksheet) return
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]
      
      const rawHeaders = (jsonData[0] || []).map(h => String(h || '').trim().toLowerCase())
      const schoolNameIdx = rawHeaders.findIndex(h => h.includes('school') && (h.includes('name') || !h.includes('id')))
      const schoolIdIdx = rawHeaders.findIndex(h => h.includes('id') || h.includes('school id'))
      const reqIdx = rawHeaders.findIndex(h => h.includes('req') || h.includes('required'))
      const existIdx = rawHeaders.findIndex(h => h.includes('exist') || h.includes('existing'))
      const tOutIdx = rawHeaders.findIndex(h => h.includes('out') || h.includes('t-out') || h.includes('transfer out'))
      const tInIdx = rawHeaders.findIndex(h => h.includes('in') || h.includes('t-in') || h.includes('transfer in'))

      const allRows: any[] = []
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i]
        if (!row || row.length === 0) continue

        const sName = schoolNameIdx !== -1 ? String(row[schoolNameIdx] || '').trim() : String(row[1] || '').trim()
        const sId = schoolIdIdx !== -1 ? String(row[schoolIdIdx] || '').trim() : String(row[0] || '').trim()

        if (!sName && !sId) continue

        allRows.push({
          schoolId: sId,
          schoolName: sName,
          required: reqIdx !== -1 ? Number(row[reqIdx]) || 0 : Number(row[2]) || 0,
          existing: existIdx !== -1 ? Number(row[existIdx]) || 0 : Number(row[3]) || 0,
          transferOut: tOutIdx !== -1 ? Number(row[tOutIdx]) || 0 : Number(row[4]) || 0,
          transferIn: tInIdx !== -1 ? Number(row[tInIdx]) || 0 : Number(row[5]) || 0,
        })
      }

      emit('import', allRows)
      closeModal()
    })
  }
}

function downloadTemplate() {
  const wsData = [
    ['School ID', 'School Name', 'Required', 'Existing', 'Transfer Out', 'Transfer In'],
    ['119964', 'Sample Elementary School', 50, 48, 1, 0],
    ['119965', 'Second Sample ES', 45, 45, 0, 2],
  ]
  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${props.category}_Template`)
  XLSX.writeFile(wb, `DepEd_${props.category}_TNA_Template.xlsx`)
}

function closeModal() {
  selectedFile.value = null
  previewRows.value = []
  errorMessage.value = ''
  parsedCount.value = 0
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-box">
      <div class="modal-header">
        <div class="header-left">
          <span class="header-icon">📥</span>
          <div>
            <h3 class="modal-title">Import {{ category }} Data</h3>
            <p class="modal-sub">Upload Excel (.xlsx, .xls) or CSV file with school needs and transfer numbers</p>
          </div>
        </div>
        <button class="close-btn" @click="closeModal">✕</button>
      </div>

      <div class="modal-body">
        <!-- Template Download Note -->
        <div class="template-bar">
          <div class="template-info">
            <span>Supported columns: <strong>School ID, School Name, Required, Existing, Transfer Out, Transfer In</strong></span>
          </div>
          <button class="btn btn-secondary btn-sm" @click="downloadTemplate">
            📄 Download Sample Excel
          </button>
        </div>

        <!-- Drag & Drop Zone -->
        <div
          class="drop-zone"
          :class="{ 'has-file': selectedFile }"
          @dragover.prevent
          @drop="handleDrop"
          @click="fileInput?.click()"
        >
          <input
            ref="fileInput"
            type="file"
            accept=".xlsx, .xls, .csv"
            style="display: none"
            @change="handleFileChange"
          />

          <div v-if="!selectedFile" class="drop-content">
            <span class="upload-icon">📁</span>
            <span class="drop-text">Click or drag & drop Excel / CSV file here</span>
            <span class="drop-hint">Files ending with .xlsx, .xls, or .csv</span>
          </div>

          <div v-else class="file-loaded">
            <span class="file-icon">📊</span>
            <div class="file-details">
              <strong>{{ selectedFile.name }}</strong>
              <span>{{ (selectedFile.size / 1024).toFixed(1) }} KB • {{ parsedCount }} valid school rows detected</span>
            </div>
            <button class="btn btn-secondary btn-sm" @click.stop="fileInput?.click()">Change File</button>
          </div>
        </div>

        <div v-if="errorMessage" class="error-banner">
          ⚠️ {{ errorMessage }}
        </div>

        <!-- Preview Table -->
        <div v-if="previewRows.length > 0" class="preview-section">
          <div class="preview-header">
            <span>Data Preview (Showing first {{ previewRows.length }} of {{ parsedCount }} rows):</span>
          </div>
          <div class="preview-table-wrap">
            <table class="preview-table">
              <thead>
                <tr>
                  <th>School ID</th>
                  <th>School Name</th>
                  <th>Required</th>
                  <th>Existing</th>
                  <th>GAP</th>
                  <th>T-Out</th>
                  <th>T-In</th>
                  <th>Needs</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(row, idx) in previewRows" :key="idx">
                  <td>{{ row.schoolId }}</td>
                  <td class="font-medium">{{ row.schoolName }}</td>
                  <td>{{ row.required }}</td>
                  <td>{{ row.existing }}</td>
                  <td :class="row.required - row.existing > 0 ? 'text-red' : 'text-green'">
                    {{ row.required - row.existing }}
                  </td>
                  <td>{{ row.transferOut }}</td>
                  <td>{{ row.transferIn }}</td>
                  <td class="font-bold" :class="(row.required - row.existing + row.transferOut - row.transferIn) > 0 ? 'text-red' : 'text-green'">
                    {{ (row.required - row.existing) + row.transferOut - row.transferIn }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="modal-footer">
        <button class="btn btn-secondary" @click="closeModal">Cancel</button>
        <button
          class="btn btn-primary"
          :disabled="previewRows.length === 0 || isProcessing"
          @click="confirmImport"
        >
          Confirm & Import {{ parsedCount }} Records
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(15, 23, 42, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1.5rem;
}

.modal-box {
  background: #ffffff;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.header-icon {
  font-size: 1.5rem;
}

.modal-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--color-text-main);
}

.modal-sub {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.25rem;
  color: var(--color-text-light);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: #f1f5f9;
  color: var(--color-text-main);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.template-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background-color: var(--color-primary-light);
  border-radius: var(--radius-md);
  border: 1px solid #bfdbfe;
}

.template-info {
  font-size: 0.82rem;
  color: #1e40af;
}

.btn-sm {
  padding: 0.35rem 0.75rem;
  font-size: 0.8rem;
}

.drop-zone {
  border: 2px dashed #cbd5e1;
  border-radius: var(--radius-md);
  padding: 2rem 1.5rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  background-color: #f8fafc;
}

.drop-zone:hover {
  border-color: #2563eb;
  background-color: #eff6ff;
}

.drop-zone.has-file {
  border-color: #16a34a;
  background-color: #f0fdf4;
}

.drop-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.upload-icon {
  font-size: 2.25rem;
}

.drop-text {
  font-weight: 600;
  color: var(--color-text-main);
  font-size: 0.95rem;
}

.drop-hint {
  font-size: 0.78rem;
  color: var(--color-text-muted);
}

.file-loaded {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-icon {
  font-size: 2rem;
}

.file-details {
  display: flex;
  flex-direction: column;
  text-align: left;
  flex: 1;
  margin: 0 1rem;
}

.file-details strong {
  font-size: 0.95rem;
  color: var(--color-text-main);
}

.file-details span {
  font-size: 0.8rem;
  color: var(--color-text-muted);
}

.error-banner {
  padding: 0.75rem 1rem;
  background-color: var(--color-danger-bg);
  border: 1px solid var(--color-danger-border);
  color: var(--color-danger-text);
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.preview-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.preview-header {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.preview-table-wrap {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow-x: auto;
}

.preview-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.8rem;
  text-align: left;
}

.preview-table th {
  background: #f1f5f9;
  padding: 0.5rem 0.75rem;
  font-weight: 600;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
}

.preview-table td {
  padding: 0.5rem 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.text-red {
  color: #dc2626;
  font-weight: 600;
}

.text-green {
  color: #16a34a;
  font-weight: 600;
}

.font-medium {
  font-weight: 500;
}

.font-bold {
  font-weight: 700;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background-color: #f8fafc;
}
</style>
