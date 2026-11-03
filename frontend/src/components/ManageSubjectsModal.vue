<script setup lang="ts">
import { ref, computed } from 'vue'
import { tnaStore } from '../stores/tnaStore'

const props = defineProps<{
  category: 'JHS' | 'SHS'
  isOpen: boolean
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const newSubjectName = ref('')
const feedbackMsg = ref('')
const isError = ref(false)

const subjects = computed(() =>
  props.category === 'JHS' ? tnaStore.jhsSubjects : tnaStore.shsSubjects
)

function handleAdd() {
  const res = tnaStore.addSubject(props.category, newSubjectName.value)
  if (!res.ok) {
    isError.value = true
    feedbackMsg.value = res.message || 'Could not add subject.'
    return
  }
  isError.value = false
  feedbackMsg.value = `Added "${res.name}" to ${props.category} subjects, templates, and school records!`
  newSubjectName.value = ''
}

function handleRemove(subj: string) {
  if (subjects.value.length <= 1) {
    isError.value = true
    feedbackMsg.value = 'At least one subject must remain.'
    return
  }
  if (
    confirm(
      `Remove subject "${subj}" from ${props.category}? Its column and numbers will be removed from all ${props.category} schools.`
    )
  ) {
    tnaStore.removeSubject(props.category, subj)
    isError.value = false
    feedbackMsg.value = `Removed "${subj}" from ${props.category}.`
  }
}

function handleResetDefaults() {
  if (confirm(`Reset ${props.category} subject list back to official DepEd defaults?`)) {
    tnaStore.resetSubjectsToDefault(props.category)
    isError.value = false
    feedbackMsg.value = `Reset ${props.category} subjects to default list.`
  }
}

function closeModal() {
  newSubjectName.value = ''
  feedbackMsg.value = ''
  isError.value = false
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="closeModal">
    <div class="modal-card">
      <div class="modal-header">
        <div>
          <h3 class="modal-title">⚙️ Manage {{ category }} Subjects / Tracks</h3>
          <p class="modal-sub">
            Add or remove subjects for {{ category }}. New subjects are automatically added to all schools, deployments, and Excel templates.
          </p>
        </div>
        <button class="close-x" @click="closeModal">✕</button>
      </div>

      <div class="modal-body">
        <!-- Add New Subject Form -->
        <form class="add-subj-row" @submit.prevent="handleAdd">
          <input
            v-model="newSubjectName"
            type="text"
            class="form-input"
            :placeholder="
              category === 'SHS'
                ? 'Enter new subject/track (e.g. STEM, HUMSS, GAS, Sports)...'
                : 'Enter new JHS subject (e.g. SPA, Journalism, Foreign Language)...'
            "
          />
          <button type="submit" class="btn btn-primary">➕ Add Subject</button>
        </form>

        <div v-if="feedbackMsg" class="feedback-banner" :class="isError ? 'banner-err' : 'banner-ok'">
          {{ feedbackMsg }}
        </div>

        <!-- Current Subjects List -->
        <div class="subj-list-header">
          <span>Active {{ category }} Subjects ({{ subjects.length }})</span>
          <button type="button" class="btn-reset-link" @click="handleResetDefaults">
            🔄 Restore Default Subjects
          </button>
        </div>

        <div class="subj-chips-grid">
          <div v-for="(subj, idx) in subjects" :key="subj" class="subj-chip-card">
            <span class="subj-idx">{{ idx + 1 }}.</span>
            <span class="subj-name">{{ subj }}</span>
            <button
              type="button"
              class="subj-del-btn"
              title="Remove subject"
              :disabled="subjects.length <= 1"
              @click="handleRemove(subj)"
            >
              ✕
            </button>
          </div>
        </div>

        <div class="tip-box">
          💡 <strong>Tip:</strong> When you download the <strong>📄 Template</strong> after adding a subject here, the Excel file will automatically include
          <code>&lt;Subject&gt; Required</code> and <code>&lt;Subject&gt; Existing</code> columns!
        </div>
      </div>

      <div class="modal-footer">
        <button type="button" class="btn btn-primary" @click="closeModal">Done</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.55);
  backdrop-filter: blur(3px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-card {
  background: #ffffff;
  border-radius: 12px;
  width: 580px;
  max-width: 95vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.15rem 1.35rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #0f172a;
}

.modal-sub {
  margin: 0.25rem 0 0;
  font-size: 0.78rem;
  color: #64748b;
}

.close-x {
  border: none;
  background: none;
  font-size: 1.1rem;
  cursor: pointer;
  color: #64748b;
}

.modal-body {
  padding: 1.25rem 1.35rem;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.add-subj-row {
  display: flex;
  gap: 0.6rem;
}

.form-input {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  font-size: 0.85rem;
  outline: none;
}

.form-input:focus {
  border-color: var(--color-primary);
}

.btn {
  border: 1px solid transparent;
  border-radius: 8px;
  padding: 0.55rem 1rem;
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.btn-primary {
  background: var(--color-primary);
  color: #ffffff;
}

.feedback-banner {
  padding: 0.55rem 0.85rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 600;
}

.banner-ok {
  background: #ecfdf5;
  color: #047857;
  border: 1px solid #a7f3d0;
}

.banner-err {
  background: #fef2f2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.subj-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  color: #475569;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.btn-reset-link {
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 0.76rem;
  font-weight: 700;
  cursor: pointer;
}

.subj-chips-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(155px, 1fr));
  gap: 0.55rem;
}

.subj-chip-card {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.65rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 0.83rem;
}

.subj-idx {
  color: #94a3b8;
  font-size: 0.75rem;
  font-weight: 600;
}

.subj-name {
  flex: 1;
  font-weight: 700;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.subj-del-btn {
  border: none;
  background: transparent;
  color: #94a3b8;
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.subj-del-btn:hover:not(:disabled) {
  background: #fee2e2;
  color: #dc2626;
}

.tip-box {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  color: #1e3a8a;
  font-size: 0.78rem;
  padding: 0.65rem 0.85rem;
  border-radius: 8px;
  line-height: 1.45;
}

.modal-footer {
  padding: 0.85rem 1.35rem;
  border-top: 1px solid var(--color-border);
  display: flex;
  justify-content: flex-end;
  background: #f8fafc;
}
</style>

