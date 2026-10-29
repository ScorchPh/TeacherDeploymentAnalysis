<script setup lang="ts">
import { ref, computed } from 'vue'
import {
  downloadTemplateFile,
  exportCategoryBackupExcel,
  parseCategoryWorkbook,
  type ParsedImportRow,
} from '../utils/excelTemplate'
import { tnaStore } from '../stores/tnaStore'

const props = defineProps<{
  category: 'ES' | 'JHS' | 'SHS'
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'import', data: ParsedImportRow[]): void
}>()

const fileInput = ref<HTMLInputElement | null>(null)
const selectedFile = ref<File | null>(null)
const parsedAllRows = ref<ParsedImportRow[]>([])
const previewRows = ref<ParsedImportRow[]>([])
const parsedCount = ref(0)
const errorMessage = ref('')
const isProcessing = ref(false)
const showBackupConfirmModal = ref(false)
const hasDownloadedBackup = ref(false)

const currentDeployCount = computed(
  () => tnaStore.deploymentRecords.filter((d) => d.category === props.category).length
)

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
    const result = parseCategoryWorkbook(data, props.category)
    if (result.error) {
      errorMessage.value = result.error
      parsedAllRows.value = []
      previewRows.value = []
      parsedCount.value = 0
      return
    }
    parsedAllRows.value = result.rows
    parsedCount.value = result.rows.length
    previewRows.value = result.rows.slice(0, 5)
  } catch (err: any) {
    errorMessage.value = `Error parsing file: ${err.message || 'Invalid Excel or CSV file'}`
  } finally {
    isProcessing.value = false
  }
}

function requestConfirmImport() {
  if (parsedAllRows.value.length > 0) {
    showBackupConfirmModal.value = true
  }
}

function proceedWithImport() {
  if (parsedAllRows.value.length > 0) {
    emit('import', parsedAllRows.value)
    closeModal()
  }
}

function downloadBackup() {
  exportCategoryBackupExcel(props.category)
  hasDownloadedBackup.value = true
}

function downloadTemplate() {
  downloadTemplateFile(props.category)
}

function closeModal() {
  selectedFile.value = null
  parsedAllRows.value = []
  previewRows.value = []
  errorMessage.value = ''
  parsedCount.value = 0
  showBackupConfirmModal.value = false
  hasDownloadedBackup.value = false
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
        <!-- Template & Backup Download Note -->
        <div class="template-bar">
          <div class="template-info">
            <span>Need the format or want to back up current {{ category }} records before importing?</span>
          </div>
          <div class="template-actions">
            <button class="btn btn-secondary btn-sm" @click="downloadBackup">
              💾 Backup Current Data
            </button>
            <button class="btn btn-secondary btn-sm" @click="downloadTemplate">
              📄 Download Sample Excel
            </button>
          </div>
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
          @click="requestConfirmImport"
        >
          Confirm & Import {{ parsedCount }} Records
        </button>
      </div>

      <!-- Pre-Import Backup Reminder Confirmation Modal -->
      <div v-if="showBackupConfirmModal" class="backup-confirm-overlay" @click.self="showBackupConfirmModal = false">
        <div class="backup-confirm-card">
          <div class="backup-confirm-icon">⚠️</div>
          <h4 class="backup-confirm-title">Have you downloaded a backup copy of your current data?</h4>
          <p class="backup-confirm-desc">
            Importing new <strong>{{ category }}</strong> data will update matching school records and
            <strong>clear {{ currentDeployCount }} existing {{ category }} Deployment record(s)</strong>
            so fresh transfer counts start at 0.
          </p>

          <div class="backup-download-box">
            <button class="btn btn-backup-dl" @click="downloadBackup">
              💾 {{ hasDownloadedBackup ? 'Backup Downloaded! (Click to Download Again)' : `Download ${category} Backup Excel (.xlsx) First` }}
            </button>
          </div>

          <div class="backup-confirm-actions">
            <button class="btn btn-secondary" @click="showBackupConfirmModal = false">
              Go Back
            </button>
            <button class="btn btn-primary" @click="proceedWithImport">
              ✅ Yes, I Have a Backup — Import Now
            </button>
          </div>
        </div>
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

.template-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.backup-confirm-overlay {
  position: absolute;
  inset: 0;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  z-index: 20;
}

.backup-confirm-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.75rem;
  max-width: 480px;
  width: 100%;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.25);
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  border: 1px solid #fde68a;
}

.backup-confirm-icon {
  font-size: 2.4rem;
  line-height: 1;
}

.backup-confirm-title {
  margin: 0;
  font-size: 1.08rem;
  font-weight: 800;
  color: #0f172a;
}

.backup-confirm-desc {
  margin: 0;
  font-size: 0.86rem;
  color: #475569;
  line-height: 1.5;
}

.backup-download-box {
  background: #fffbeb;
  border: 1px dashed #f59e0b;
  border-radius: 8px;
  padding: 0.75rem;
}

.btn-backup-dl {
  width: 100%;
  background: #f59e0b;
  color: #ffffff;
  font-weight: 700;
  border: none;
  padding: 0.6rem 1rem;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.85rem;
}

.btn-backup-dl:hover {
  background: #d97706;
}

.backup-confirm-actions {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 0.25rem;
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
