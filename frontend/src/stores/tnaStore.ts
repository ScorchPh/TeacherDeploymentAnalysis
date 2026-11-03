import { reactive, computed, watch } from 'vue'
import type {
  EsRecord,
  JhsRecord,
  ShsRecord,
  JhsSubject,
  ShsSubject,
  CategoryType,
  DeploymentRecord,
} from '../types/tna'
import { JHS_SUBJECTS, SHS_SUBJECTS } from '../types/tna'

const ES_STORAGE_KEY = 'tna_es_records_v1'
const JHS_STORAGE_KEY = 'tna_jhs_records_v1'
const SHS_STORAGE_KEY = 'tna_shs_records_v2'
const DEPLOYMENT_STORAGE_KEY = 'tna_deployment_records_v1'
const JHS_SUBJECTS_STORAGE_KEY = 'tna_jhs_subjects_v1'
const SHS_SUBJECTS_STORAGE_KEY = 'tna_shs_subjects_v1'

// Initial ES Data from DepEd Lapu-Lapu City files
const initialEsData: EsRecord[] = [
  { id: '1', schoolId: '119964', schoolName: 'Buaya ES', required: 55, existing: 51, transferOut: 2, transferIn: 1 },
  { id: '2', schoolId: '119966', schoolName: 'Babag II ES', required: 51, existing: 43, transferOut: 0, transferIn: 2 },
  { id: '3', schoolId: '119974', schoolName: 'Bagong Silang ES', required: 48, existing: 49, transferOut: 0, transferIn: 0 },
  { id: '4', schoolId: '119968', schoolName: 'Basak ES', required: 64, existing: 59, transferOut: 0, transferIn: 0 },
  { id: '5', schoolId: '119978', schoolName: 'Maribago ES', required: 54, existing: 50, transferOut: 1, transferIn: 0 },
  { id: '6', schoolId: '119965', schoolName: 'Babag I ES', required: 53, existing: 59, transferOut: 0, transferIn: 0 },
  { id: '7', schoolId: '119984', schoolName: 'Sudtonggan ES', required: 51, existing: 49, transferOut: 0, transferIn: 0 },
  { id: '8', schoolId: '119958', schoolName: 'Pajo ES', required: 58, existing: 49, transferOut: 0, transferIn: 0 },
  { id: '9', schoolId: '119972', schoolName: 'Abuno ES', required: 41, existing: 40, transferOut: 0, transferIn: 0 },
  { id: '10', schoolId: '119990', schoolName: 'Talima ES', required: 30, existing: 28, transferOut: 0, transferIn: 2 },
  { id: '11', schoolId: '119970', schoolName: 'Pusok ES', required: 74, existing: 73, transferOut: 0, transferIn: 1 },
  { id: '12', schoolId: '119963', schoolName: 'Bankal ES', required: 112, existing: 105, transferOut: 1, transferIn: 1 },
  { id: '13', schoolId: '119983', schoolName: 'Suba-Basbas ES', required: 54, existing: 50, transferOut: 0, transferIn: 0 },
  { id: '14', schoolId: '119973', schoolName: 'Agus ES', required: 47, existing: 42, transferOut: 0, transferIn: 0 },
  { id: '15', schoolId: '119976', schoolName: 'Buyong ES', required: 44, existing: 39, transferOut: 2, transferIn: 0 },
]

function createDefaultSubjectRecord<T extends string>(subjects: T[], defaultVal = 0): Record<T, number> {
  const obj = {} as Record<T, number>
  subjects.forEach(s => { obj[s] = defaultVal })
  return obj
}

// Initial JHS Data
const initialJhsData: JhsRecord[] = [
  {
    id: '1',
    schoolId: '303031',
    schoolName: 'Abuno HS',
    required: { Filipino: 4, English: 4, Math: 4, Science: 4, AralPan: 4, TLE: 4, MAPEH: 4, EsP: 4, SPED: 0 },
    existing: { Filipino: 4, English: 4, Math: 3, Science: 4, AralPan: 4, TLE: 3, MAPEH: 4, EsP: 3, SPED: 0 },
    transferOut: { Filipino: 0, English: 0, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
    transferIn: { Filipino: 0, English: 0, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
  },
  {
    id: '2',
    schoolId: '303032',
    schoolName: 'Babag NHS',
    required: { Filipino: 20, English: 20, Math: 20, Science: 20, AralPan: 20, TLE: 20, MAPEH: 20, EsP: 20, SPED: 0 },
    existing: { Filipino: 29, English: 23, Math: 19, Science: 19, AralPan: 17, TLE: 23, MAPEH: 21, EsP: 8, SPED: 2 },
    transferOut: { Filipino: 0, English: 0, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
    transferIn: { Filipino: 0, English: 0, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
  },
  {
    id: '3',
    schoolId: '303033',
    schoolName: 'Bankal NHS',
    required: { Filipino: 20, English: 20, Math: 20, Science: 20, AralPan: 20, TLE: 20, MAPEH: 20, EsP: 20, SPED: 0 },
    existing: { Filipino: 18, English: 20, Math: 27, Science: 24, AralPan: 16, TLE: 16, MAPEH: 18, EsP: 16, SPED: 1 },
    transferOut: { Filipino: 0, English: 0, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
    transferIn: { Filipino: 0, English: 0, Math: 0, Science: 1, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
  },
  {
    id: '4',
    schoolId: '303034',
    schoolName: 'Basak Night HS',
    required: { Filipino: 4, English: 4, Math: 4, Science: 4, AralPan: 4, TLE: 4, MAPEH: 4, EsP: 4, SPED: 0 },
    existing: { Filipino: 5, English: 3, Math: 4, Science: 5, AralPan: 3, TLE: 2, MAPEH: 2, EsP: 0, SPED: 0 },
    transferOut: { Filipino: 0, English: 0, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
    transferIn: { Filipino: 0, English: 0, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
  },
  {
    id: '5',
    schoolId: '303035',
    schoolName: 'Marigondon NHS',
    required: { Filipino: 30, English: 30, Math: 30, Science: 30, AralPan: 30, TLE: 30, MAPEH: 30, EsP: 30, SPED: 0 },
    existing: { Filipino: 27, English: 27, Math: 23, Science: 21, AralPan: 19, TLE: 65, MAPEH: 17, EsP: 7, SPED: 0 },
    transferOut: { Filipino: 0, English: 1, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
    transferIn: { Filipino: 0, English: 0, Math: 0, Science: 0, AralPan: 0, TLE: 0, MAPEH: 0, EsP: 0, SPED: 0 },
  },
]

// Initial SHS Data
const initialShsData: ShsRecord[] = [
  {
    id: '1',
    schoolId: '340001',
    schoolName: 'Babag SHS',
    required: { ABM: 1, AralPan: 8, English: 12, Filipino: 5, MAPEH: 4, Math: 4, Science: 7, 'TVL-AFA': 9, 'TVL-HE': 4, 'TVL-IA': 1, 'TVL-ICT': 4 },
    existing: { ABM: 3, AralPan: 6, English: 15, Filipino: 9, MAPEH: 3, Math: 11, Science: 11, 'TVL-AFA': 0, 'TVL-HE': 10, 'TVL-IA': 0, 'TVL-ICT': 3 },
    transferOut: { ABM: 0, AralPan: 0, English: 0, Filipino: 0, MAPEH: 0, Math: 0, Science: 0, 'TVL-AFA': 0, 'TVL-HE': 0, 'TVL-IA': 0, 'TVL-ICT': 0 },
    transferIn: { ABM: 0, AralPan: 0, English: 0, Filipino: 0, MAPEH: 0, Math: 0, Science: 0, 'TVL-AFA': 0, 'TVL-HE': 0, 'TVL-IA': 0, 'TVL-ICT': 0 },
  },
  {
    id: '2',
    schoolId: '340002',
    schoolName: 'Bankal SHS',
    required: { ABM: 1, AralPan: 7, English: 11, Filipino: 5, MAPEH: 3, Math: 4, Science: 8, 'TVL-AFA': 8, 'TVL-HE': 4, 'TVL-IA': 1, 'TVL-ICT': 3 },
    existing: { ABM: 2, AralPan: 6, English: 7, Filipino: 3, MAPEH: 4, Math: 7, Science: 7, 'TVL-AFA': 0, 'TVL-HE': 5, 'TVL-IA': 0, 'TVL-ICT': 4 },
    transferOut: { ABM: 0, AralPan: 0, English: 0, Filipino: 0, MAPEH: 0, Math: 0, Science: 0, 'TVL-AFA': 0, 'TVL-HE': 0, 'TVL-IA': 0, 'TVL-ICT': 0 },
    transferIn: { ABM: 0, AralPan: 0, English: 0, Filipino: 0, MAPEH: 0, Math: 0, Science: 0, 'TVL-AFA': 0, 'TVL-HE': 0, 'TVL-IA': 0, 'TVL-ICT': 0 },
  },
  {
    id: '3',
    schoolId: '340003',
    schoolName: 'Marigondon SHS',
    required: { ABM: 3, AralPan: 9, English: 14, Filipino: 6, MAPEH: 4, Math: 4, Science: 9, 'TVL-AFA': 9, 'TVL-HE': 3, 'TVL-IA': 3, 'TVL-ICT': 3 },
    existing: { ABM: 3, AralPan: 6, English: 10, Filipino: 5, MAPEH: 4, Math: 6, Science: 6, 'TVL-AFA': 0, 'TVL-HE': 6, 'TVL-IA': 7, 'TVL-ICT': 3 },
    transferOut: { ABM: 0, AralPan: 0, English: 0, Filipino: 0, MAPEH: 0, Math: 0, Science: 0, 'TVL-AFA': 0, 'TVL-HE': 0, 'TVL-IA': 0, 'TVL-ICT': 0 },
    transferIn: { ABM: 0, AralPan: 0, English: 0, Filipino: 0, MAPEH: 0, Math: 0, Science: 0, 'TVL-AFA': 0, 'TVL-HE': 0, 'TVL-IA': 0, 'TVL-ICT': 0 },
  },
]

function loadStored<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error(`Failed to load ${key}:`, e)
  }
  return fallback
}

export const tnaStore = reactive({
  jhsSubjects: loadStored<string>(JHS_SUBJECTS_STORAGE_KEY, [...JHS_SUBJECTS]),
  shsSubjects: loadStored<string>(SHS_SUBJECTS_STORAGE_KEY, [...SHS_SUBJECTS]),
  esRecords: loadStored<EsRecord>(ES_STORAGE_KEY, initialEsData),
  jhsRecords: loadStored<JhsRecord>(JHS_STORAGE_KEY, initialJhsData),
  shsRecords: loadStored<ShsRecord>(SHS_STORAGE_KEY, initialShsData),
  deploymentRecords: loadStored<DeploymentRecord>(DEPLOYMENT_STORAGE_KEY, []),

  // Calculation helpers for ES
  calcEsGap(r: EsRecord): number {
    return Math.round(Number(r.required) || 0) - Math.round(Number(r.existing) || 0)
  },
  calcEsNeeds(r: EsRecord): number {
    const gap = this.calcEsGap(r)
    return (gap + Math.round(Number(r.transferOut) || 0)) - Math.round(Number(r.transferIn) || 0)
  },

  // Calculation helpers for JHS
  calcJhsSubjectGap(r: JhsRecord, s: JhsSubject): number {
    return Math.round(Number(r.required?.[s]) || 0) - Math.round(Number(r.existing?.[s]) || 0)
  },
  calcJhsSubjectNeeds(r: JhsRecord, s: JhsSubject): number {
    const gap = this.calcJhsSubjectGap(r, s)
    return (gap + Math.round(Number(r.transferOut?.[s]) || 0)) - Math.round(Number(r.transferIn?.[s]) || 0)
  },
  calcJhsTotalRequired(r: JhsRecord): number {
    return this.jhsSubjects.reduce((acc, s) => acc + Math.round(Number(r.required?.[s]) || 0), 0)
  },
  calcJhsTotalExisting(r: JhsRecord): number {
    return this.jhsSubjects.reduce((acc, s) => acc + Math.round(Number(r.existing?.[s]) || 0), 0)
  },
  calcJhsTotalGap(r: JhsRecord): number {
    return this.jhsSubjects.reduce((acc, s) => acc + this.calcJhsSubjectGap(r, s), 0)
  },
  calcJhsTotalTransferOut(r: JhsRecord): number {
    return this.jhsSubjects.reduce((acc, s) => acc + Math.round(Number(r.transferOut?.[s]) || 0), 0)
  },
  calcJhsTotalTransferIn(r: JhsRecord): number {
    return this.jhsSubjects.reduce((acc, s) => acc + Math.round(Number(r.transferIn?.[s]) || 0), 0)
  },
  calcJhsTotalNeeds(r: JhsRecord): number {
    return this.jhsSubjects.reduce((acc, s) => acc + this.calcJhsSubjectNeeds(r, s), 0)
  },

  // Calculation helpers for SHS
  calcShsSubjectGap(r: ShsRecord, s: ShsSubject): number {
    return Math.round(Number(r.required?.[s]) || 0) - Math.round(Number(r.existing?.[s]) || 0)
  },
  calcShsSubjectNeeds(r: ShsRecord, s: ShsSubject): number {
    const gap = this.calcShsSubjectGap(r, s)
    return (gap + Math.round(Number(r.transferOut?.[s]) || 0)) - Math.round(Number(r.transferIn?.[s]) || 0)
  },
  calcShsTotalRequired(r: ShsRecord): number {
    return this.shsSubjects.reduce((acc, s) => acc + Math.round(Number(r.required?.[s]) || 0), 0)
  },
  calcShsTotalExisting(r: ShsRecord): number {
    return this.shsSubjects.reduce((acc, s) => acc + Math.round(Number(r.existing?.[s]) || 0), 0)
  },
  calcShsTotalGap(r: ShsRecord): number {
    return this.shsSubjects.reduce((acc, s) => acc + this.calcShsSubjectGap(r, s), 0)
  },
  calcShsTotalTransferOut(r: ShsRecord): number {
    return this.shsSubjects.reduce((acc, s) => acc + Math.round(Number(r.transferOut?.[s]) || 0), 0)
  },
  calcShsTotalTransferIn(r: ShsRecord): number {
    return this.shsSubjects.reduce((acc, s) => acc + Math.round(Number(r.transferIn?.[s]) || 0), 0)
  },
  calcShsTotalNeeds(r: ShsRecord): number {
    return this.shsSubjects.reduce((acc, s) => acc + this.calcShsSubjectNeeds(r, s), 0)
  },

  // ES Mutations
  addEsRecord(record: Omit<EsRecord, 'id'>) {
    this.esRecords.push({
      ...record,
      required: Math.round(Number(record.required) || 0),
      existing: Math.round(Number(record.existing) || 0),
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    })
    this.syncTransfers('ES')
  },
  updateEsRecord(id: string, updates: Partial<EsRecord>) {
    const idx = this.esRecords.findIndex(r => r.id === id)
    if (idx !== -1 && this.esRecords[idx]) {
      const oldName = this.esRecords[idx].schoolName
      Object.assign(this.esRecords[idx], updates)
      this.esRecords[idx].required = Math.round(Number(this.esRecords[idx].required) || 0)
      this.esRecords[idx].existing = Math.round(Number(this.esRecords[idx].existing) || 0)
      if (updates.schoolName) this.renameSchoolInDeployments('ES', oldName, updates.schoolName)
      this.syncTransfers('ES')
    }
  },
  deleteEsRecord(id: string) {
    this.esRecords = this.esRecords.filter(r => r.id !== id)
  },

  // JHS Mutations
  addJhsRecord(record: Omit<JhsRecord, 'id'>) {
    this.jhsRecords.push({
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    })
    this.syncTransfers('JHS')
  },
  updateJhsRecord(id: string, updates: Partial<JhsRecord>) {
    const idx = this.jhsRecords.findIndex(r => r.id === id)
    if (idx !== -1 && this.jhsRecords[idx]) {
      const oldName = this.jhsRecords[idx].schoolName
      Object.assign(this.jhsRecords[idx], updates)
      if (updates.schoolName) this.renameSchoolInDeployments('JHS', oldName, updates.schoolName)
      this.syncTransfers('JHS')
    }
  },
  deleteJhsRecord(id: string) {
    this.jhsRecords = this.jhsRecords.filter(r => r.id !== id)
  },

  // SHS Mutations
  addShsRecord(record: Omit<ShsRecord, 'id'>) {
    this.shsRecords.push({
      ...record,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    })
    this.syncTransfers('SHS')
  },
  updateShsRecord(id: string, updates: Partial<ShsRecord>) {
    const idx = this.shsRecords.findIndex(r => r.id === id)
    if (idx !== -1 && this.shsRecords[idx]) {
      const oldName = this.shsRecords[idx].schoolName
      Object.assign(this.shsRecords[idx], updates)
      if (updates.schoolName) this.renameSchoolInDeployments('SHS', oldName, updates.schoolName)
      this.syncTransfers('SHS')
    }
  },
  deleteShsRecord(id: string) {
    this.shsRecords = this.shsRecords.filter(r => r.id !== id)
  },

  // Batch import for ES
  importEsRecords(records: Partial<EsRecord>[]) {
    records.forEach(row => {
      const rowName = String(row.schoolName || '').trim().toLowerCase()
      const rowId = String(row.schoolId || '').trim()
      const existingIdx = this.esRecords.findIndex(r => {
        if (rowName) {
          return r.schoolName.trim().toLowerCase() === rowName
        }
        return rowId !== '' && r.schoolId.trim() === rowId
      })

      if (existingIdx !== -1 && this.esRecords[existingIdx]) {
        // Update existing record
        const cur = this.esRecords[existingIdx]
        if (rowId) cur.schoolId = rowId
        if (row.required !== undefined) cur.required = Math.round(Number(row.required) || 0)
        if (row.existing !== undefined) cur.existing = Math.round(Number(row.existing) || 0)
      } else if (rowName || rowId) {
        // Insert new record
        this.addEsRecord({
          schoolId: rowId,
          schoolName: String(row.schoolName || 'Unnamed School').trim(),
          required: Math.round(Number(row.required) || 0),
          existing: Math.round(Number(row.existing) || 0),
          transferOut: 0,
          transferIn: 0,
        })
      }
    })
    this.deduplicateSchools()
    this.clearDeploymentsByCategory('ES')
  },

  // Reset to initial data
  resetAll() {
    this.esRecords = JSON.parse(JSON.stringify(initialEsData))
    this.jhsRecords = JSON.parse(JSON.stringify(initialJhsData))
    this.shsRecords = JSON.parse(JSON.stringify(initialShsData))
    this.syncAllTransfers()
  },

  // ---------------------------------------------------------------------------
  // Deployment (Transfer In / Transfer Out) records
  // ---------------------------------------------------------------------------

  getSchoolsForCategory(category: CategoryType): { schoolName: string }[] {
    if (category === 'ES') return this.esRecords
    if (category === 'JHS') return this.jhsRecords
    return this.shsRecords
  },

  // Make sure the school named in a deployment exists in its category table
  ensureSchoolExists(category: CategoryType, schoolName: string) {
    const name = schoolName.trim()
    if (!name) return
    const exists = this.getSchoolsForCategory(category).some(
      s => s.schoolName.trim().toLowerCase() === name.toLowerCase()
    )
    if (exists) return

    if (category === 'ES') {
      this.esRecords.push({
        id: Date.now().toString(),
        schoolId: '',
        schoolName: name,
        required: 0,
        existing: 0,
        transferOut: 0,
        transferIn: 0,
      })
    } else if (category === 'JHS') {
      this.jhsRecords.push({
        id: Date.now().toString(),
        schoolId: '',
        schoolName: name,
        required: createDefaultSubjectRecord(this.jhsSubjects),
        existing: createDefaultSubjectRecord(this.jhsSubjects),
        transferOut: createDefaultSubjectRecord(this.jhsSubjects),
        transferIn: createDefaultSubjectRecord(this.jhsSubjects),
      })
    } else {
      this.shsRecords.push({
        id: Date.now().toString(),
        schoolId: '',
        schoolName: name,
        required: createDefaultSubjectRecord(this.shsSubjects),
        existing: createDefaultSubjectRecord(this.shsSubjects),
        transferOut: createDefaultSubjectRecord(this.shsSubjects),
        transferIn: createDefaultSubjectRecord(this.shsSubjects),
      })
    }
  },

  // Recalculate every school's Transfer In / Transfer Out from the Deployment list
  syncTransfers(category: CategoryType) {
    const deployments = this.deploymentRecords.filter(d => d.category === category)
    const key = (n?: string) => (n || '').trim().toLowerCase()

    if (category === 'ES') {
      this.esRecords.forEach(school => {
        const sKey = key(school.schoolName)
        school.transferOut = deployments.filter(
          d => d.transferType === 'OUT' && key(d.schoolName) === sKey
        ).length
        school.transferIn = deployments.filter(
          d =>
            (d.transferType === 'IN' && key(d.schoolName) === sKey) ||
            (d.transferType === 'OUT' && d.toSchoolName && key(d.toSchoolName) === sKey)
        ).length
      })
      return
    }

    const subjects = (category === 'JHS' ? this.jhsSubjects : this.shsSubjects) as string[]
    const schools = (category === 'JHS' ? this.jhsRecords : this.shsRecords) as {
      schoolName: string
      transferIn: Record<string, number>
      transferOut: Record<string, number>
    }[]

    schools.forEach(school => {
      const sKey = key(school.schoolName)
      const tin: Record<string, number> = {}
      const tout: Record<string, number> = {}
      subjects.forEach(s => {
        tin[s] = 0
        tout[s] = 0
      })
      deployments.forEach(d => {
        if (!d.subject || !subjects.includes(d.subject)) return
        if (d.transferType === 'OUT') {
          if (key(d.schoolName) === sKey) {
            tout[d.subject] = (tout[d.subject] ?? 0) + 1
          }
          if (d.toSchoolName && key(d.toSchoolName) === sKey) {
            tin[d.subject] = (tin[d.subject] ?? 0) + 1
          }
        } else if (d.transferType === 'IN') {
          if (key(d.schoolName) === sKey) {
            tin[d.subject] = (tin[d.subject] ?? 0) + 1
          }
        }
      })
      school.transferIn = tin
      school.transferOut = tout
    })
  },

  syncAllTransfers() {
    this.syncTransfers('ES')
    this.syncTransfers('JHS')
    this.syncTransfers('SHS')
  },

  // Keep deployment entries pointing at a school when it gets renamed
  renameSchoolInDeployments(category: CategoryType, oldName: string, newName: string) {
    if (!oldName || !newName || oldName.trim().toLowerCase() === newName.trim().toLowerCase()) return
    const oldKey = oldName.trim().toLowerCase()
    this.deploymentRecords.forEach(d => {
      if (d.category !== category) return
      if (d.schoolName.trim().toLowerCase() === oldKey) {
        d.schoolName = newName.trim()
      }
      if (d.toSchoolName && d.toSchoolName.trim().toLowerCase() === oldKey) {
        d.toSchoolName = newName.trim()
      }
    })
  },

  addDeployment(record: Omit<DeploymentRecord, 'id'>) {
    this.ensureSchoolExists(record.category, record.schoolName)
    if (record.transferType === 'OUT' && record.toSchoolName) {
      this.ensureSchoolExists(record.category, record.toSchoolName)
    }
    this.deploymentRecords.push({
      ...record,
      schoolName: record.schoolName.trim(),
      toSchoolName: record.toSchoolName ? record.toSchoolName.trim() : undefined,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    })
    this.syncTransfers(record.category)
  },

  updateDeployment(id: string, updates: Partial<DeploymentRecord>) {
    const cur = this.deploymentRecords.find(d => d.id === id)
    if (!cur) return
    Object.assign(cur, updates)
    cur.schoolName = cur.schoolName.trim()
    cur.toSchoolName = cur.toSchoolName ? cur.toSchoolName.trim() : undefined
    this.ensureSchoolExists(cur.category, cur.schoolName)
    if (cur.transferType === 'OUT' && cur.toSchoolName) {
      this.ensureSchoolExists(cur.category, cur.toSchoolName)
    }
    this.syncTransfers(cur.category)
  },

  deleteDeployment(id: string) {
    const cur = this.deploymentRecords.find(d => d.id === id)
    if (!cur) return
    this.deploymentRecords = this.deploymentRecords.filter(d => d.id !== id)
    this.syncTransfers(cur.category)
  },

  clearDeploymentsByCategory(category: CategoryType) {
    this.deploymentRecords = this.deploymentRecords.filter(d => d.category !== category)
    this.syncTransfers(category)
  },

  // ---------------------------------------------------------------------------
  // Dynamic Subject Management (JHS & SHS)
  // ---------------------------------------------------------------------------
  getSubjectsForCategory(category: 'JHS' | 'SHS'): string[] {
    return category === 'JHS' ? this.jhsSubjects : this.shsSubjects
  },

  addSubject(category: 'JHS' | 'SHS', rawName: string): { ok: boolean; name: string; message?: string } {
    const clean = rawName.trim()
    if (!clean) return { ok: false, name: '', message: 'Subject name cannot be empty.' }

    const list = category === 'JHS' ? this.jhsSubjects : this.shsSubjects
    const existing = list.find(s => s.toLowerCase() === clean.toLowerCase())
    if (existing) {
      return { ok: false, name: existing, message: `"${existing}" already exists in ${category}.` }
    }

    list.push(clean)
    const records = category === 'JHS' ? this.jhsRecords : this.shsRecords
    records.forEach(r => {
      if (r.required[clean] === undefined) r.required[clean] = 0
      if (r.existing[clean] === undefined) r.existing[clean] = 0
      if (r.transferOut[clean] === undefined) r.transferOut[clean] = 0
      if (r.transferIn[clean] === undefined) r.transferIn[clean] = 0
    })
    this.syncTransfers(category)
    return { ok: true, name: clean }
  },

  removeSubject(category: 'JHS' | 'SHS', subjectName: string): boolean {
    const list = category === 'JHS' ? this.jhsSubjects : this.shsSubjects
    if (list.length <= 1) return false
    const idx = list.findIndex(s => s === subjectName)
    if (idx === -1) return false

    list.splice(idx, 1)
    const records = category === 'JHS' ? this.jhsRecords : this.shsRecords
    records.forEach(r => {
      delete r.required[subjectName]
      delete r.existing[subjectName]
      delete r.transferOut[subjectName]
      delete r.transferIn[subjectName]
    })
    this.deploymentRecords = this.deploymentRecords.filter(
      d => !(d.category === category && d.subject === subjectName)
    )
    this.syncTransfers(category)
    return true
  },

  resetSubjectsToDefault(category: 'JHS' | 'SHS') {
    const defaults = category === 'JHS' ? [...JHS_SUBJECTS] : [...SHS_SUBJECTS]
    if (category === 'JHS') {
      this.jhsSubjects = defaults
    } else {
      this.shsSubjects = defaults
    }
    this.normalizeAllIntegers()
    this.syncTransfers(category)
  },

  deduplicateSchools() {
    const seenEs = new Set<string>()
    this.esRecords = this.esRecords.filter(r => {
      const key = r.schoolName.trim().toLowerCase()
      if (!key || seenEs.has(key)) return false
      seenEs.add(key)
      return true
    })

    const seenJhs = new Set<string>()
    this.jhsRecords = this.jhsRecords.filter(r => {
      const key = r.schoolName.trim().toLowerCase()
      if (!key || seenJhs.has(key)) return false
      seenJhs.add(key)
      return true
    })

    const seenShs = new Set<string>()
    this.shsRecords = this.shsRecords.filter(r => {
      const key = r.schoolName.trim().toLowerCase()
      if (!key || seenShs.has(key)) return false
      seenShs.add(key)
      return true
    })
  },

  normalizeAllIntegers() {
    this.deduplicateSchools()
    // Ensure MAPEH is always present in shsSubjects if upgrading from an older version
    if (!this.shsSubjects.some(s => s.toLowerCase() === 'mapeh')) {
      const filIdx = this.shsSubjects.findIndex(s => s.toLowerCase() === 'filipino')
      if (filIdx !== -1) this.shsSubjects.splice(filIdx + 1, 0, 'MAPEH')
      else this.shsSubjects.push('MAPEH')
    }

    this.esRecords.forEach(r => {
      r.required = Math.round(Number(r.required) || 0)
      r.existing = Math.round(Number(r.existing) || 0)
      r.transferOut = Math.round(Number(r.transferOut) || 0)
      r.transferIn = Math.round(Number(r.transferIn) || 0)
    })
    this.jhsRecords.forEach(r => {
      this.jhsSubjects.forEach(s => {
        r.required[s] = Math.round(Number(r.required?.[s]) || 0)
        r.existing[s] = Math.round(Number(r.existing?.[s]) || 0)
      })
    })
    this.shsRecords.forEach(r => {
      this.shsSubjects.forEach(s => {
        r.required[s] = Math.round(Number(r.required?.[s]) || 0)
        r.existing[s] = Math.round(Number(r.existing?.[s]) || 0)
      })
    })
  },
})

// Normalize any previously saved decimals to whole integers & sync transfers
tnaStore.normalizeAllIntegers()
tnaStore.syncAllTransfers()

// Persistence watcher
watch(
  () => tnaStore.esRecords,
  (val) => {
    try {
      localStorage.setItem(ES_STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.error(e)
    }
  },
  { deep: true }
)

watch(
  () => tnaStore.jhsRecords,
  (val) => {
    try {
      localStorage.setItem(JHS_STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.error(e)
    }
  },
  { deep: true }
)

watch(
  () => tnaStore.shsRecords,
  (val) => {
    try {
      localStorage.setItem(SHS_STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.error(e)
    }
  },
  { deep: true }
)

watch(
  () => tnaStore.deploymentRecords,
  (val) => {
    try {
      localStorage.setItem(DEPLOYMENT_STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.error(e)
    }
  },
  { deep: true }
)

watch(
  () => tnaStore.jhsSubjects,
  (val) => {
    try {
      localStorage.setItem(JHS_SUBJECTS_STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.error(e)
    }
  },
  { deep: true }
)

watch(
  () => tnaStore.shsSubjects,
  (val) => {
    try {
      localStorage.setItem(SHS_SUBJECTS_STORAGE_KEY, JSON.stringify(val))
    } catch (e) {
      console.error(e)
    }
  },
  { deep: true }
)

