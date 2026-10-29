import * as XLSX from 'xlsx'
import { JHS_SUBJECTS, SHS_SUBJECTS, type CategoryType } from '../types/tna'
import { tnaStore } from '../stores/tnaStore'

export interface ParsedImportRow {
  schoolId: string
  schoolName: string
  required: number
  existing: number
  transferOut: number
  transferIn: number
  requiredBySubject?: Record<string, number>
  existingBySubject?: Record<string, number>
}

function getDateStamp(): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(now.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function downloadTemplateFile(category: CategoryType) {
  let wsData: (string | number)[][] = []

  if (category === 'ES') {
    wsData = [
      ['School ID', 'School Name', 'Required', 'Existing'],
      ['119964', 'Buaya ES', 55, 51],
      ['119966', 'Babag II ES', 51, 43],
    ]
  } else if (category === 'JHS') {
    const headers: string[] = ['School ID', 'School Name']
    JHS_SUBJECTS.forEach((subj) => {
      headers.push(`${subj} Required`, `${subj} Existing`)
    })
    wsData = [
      headers,
      ['303031', 'Abuno HS', 4, 4, 4, 4, 4, 3, 4, 4, 4, 4, 4, 3, 4, 4, 4, 3, 0, 0],
      ['303032', 'Babag NHS', 20, 29, 20, 23, 20, 19, 20, 19, 20, 17, 20, 23, 20, 21, 20, 8, 0, 2],
    ]
  } else {
    const headers: string[] = ['School ID', 'School Name']
    SHS_SUBJECTS.forEach((subj) => {
      headers.push(`${subj} Required`, `${subj} Existing`)
    })
    wsData = [
      headers,
      ['340001', 'Babag SHS', 1, 2, 8, 6, 13, 15, 5, 9, 4, 2, 4, 11, 7, 11, 9, 10, 4, 3, 1, 2],
      ['340002', 'Bankal SHS', 1, 2, 7, 6, 11, 7, 5, 3, 3, 4, 4, 7, 8, 7, 5, 5, 4, 3, 1, 4],
    ]
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${category}_Template`)
  XLSX.writeFile(wb, `DepEd_${category}_TNA_Template.xlsx`)
}

function buildDeploymentSheetRows(category: CategoryType): (string | number)[][] {
  const isSubjectLevel = category !== 'ES'
  const headers: string[] = [
    'No.',
    'Last Name',
    'First Name',
    'Middle Name',
    'Transfer Type',
    'School / From School',
    'To School (Transfer In)',
  ]
  if (isSubjectLevel) headers.push('Subject')
  headers.push('Current Position', 'Date Added')

  const records = tnaStore.deploymentRecords.filter((d) => d.category === category)
  const rows: (string | number)[][] = [headers]

  records.forEach((d, idx) => {
    const row: (string | number)[] = [
      idx + 1,
      d.lastName,
      d.firstName,
      d.middleName || '',
      d.transferType === 'IN' ? 'Transfer In' : 'Transfer Out',
      d.schoolName,
      d.transferType === 'OUT' ? d.toSchoolName || '' : '',
    ]
    if (isSubjectLevel) row.push(d.subject || '')
    row.push(d.currentPosition || '', d.dateAdded || '')
    rows.push(row)
  })

  return rows
}

/**
 * Exports a complete backup Excel file containing both the current Needs Analysis
 * table (re-importable format) and the current Deployment records for that category.
 */
export function exportCategoryBackupExcel(category: CategoryType) {
  const wb = XLSX.utils.book_new()

  if (category === 'ES') {
    const analysisRows: (string | number)[][] = [
      ['School ID', 'School Name', 'Required', 'Existing', 'GAP', 'Transfer Out', 'Transfer In', 'Needs'],
    ]
    tnaStore.esRecords.forEach((r) => {
      analysisRows.push([
        r.schoolId,
        r.schoolName,
        r.required,
        r.existing,
        tnaStore.calcEsGap(r),
        r.transferOut,
        r.transferIn,
        tnaStore.calcEsNeeds(r),
      ])
    })
    const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisRows)
    XLSX.utils.book_append_sheet(wb, wsAnalysis, 'ES_Needs_Backup')
  } else if (category === 'JHS') {
    const headers: string[] = ['School ID', 'School Name']
    JHS_SUBJECTS.forEach((subj) => {
      headers.push(`${subj} Required`, `${subj} Existing`)
    })
    headers.push('Total Required', 'Total Existing', 'Total GAP', 'Total T-Out', 'Total T-In', 'Total Needs')

    const analysisRows: (string | number)[][] = [headers]
    tnaStore.jhsRecords.forEach((r) => {
      const row: (string | number)[] = [r.schoolId, r.schoolName]
      JHS_SUBJECTS.forEach((subj) => {
        row.push(r.required[subj] || 0, r.existing[subj] || 0)
      })
      row.push(
        tnaStore.calcJhsTotalRequired(r),
        tnaStore.calcJhsTotalExisting(r),
        tnaStore.calcJhsTotalGap(r),
        tnaStore.calcJhsTotalTransferOut(r),
        tnaStore.calcJhsTotalTransferIn(r),
        tnaStore.calcJhsTotalNeeds(r)
      )
      analysisRows.push(row)
    })
    const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisRows)
    XLSX.utils.book_append_sheet(wb, wsAnalysis, 'JHS_Needs_Backup')
  } else {
    const headers: string[] = ['School ID', 'School Name']
    SHS_SUBJECTS.forEach((subj) => {
      headers.push(`${subj} Required`, `${subj} Existing`)
    })
    headers.push('Total Required', 'Total Existing', 'Total GAP', 'Total T-Out', 'Total T-In', 'Total Needs')

    const analysisRows: (string | number)[][] = [headers]
    tnaStore.shsRecords.forEach((r) => {
      const row: (string | number)[] = [r.schoolId, r.schoolName]
      SHS_SUBJECTS.forEach((subj) => {
        row.push(r.required[subj] || 0, r.existing[subj] || 0)
      })
      row.push(
        tnaStore.calcShsTotalRequired(r),
        tnaStore.calcShsTotalExisting(r),
        tnaStore.calcShsTotalGap(r),
        tnaStore.calcShsTotalTransferOut(r),
        tnaStore.calcShsTotalTransferIn(r),
        tnaStore.calcShsTotalNeeds(r)
      )
      analysisRows.push(row)
    })
    const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisRows)
    XLSX.utils.book_append_sheet(wb, wsAnalysis, 'SHS_Needs_Backup')
  }

  const wsDeploy = XLSX.utils.aoa_to_sheet(buildDeploymentSheetRows(category))
  XLSX.utils.book_append_sheet(wb, wsDeploy, `${category}_Deployments_Backup`)

  XLSX.writeFile(wb, `DepEd_${category}_Backup_${getDateStamp()}.xlsx`)
}

/**
 * Exports only the Deployment records for the given category to Excel.
 */
export function exportDeploymentsExcel(category: CategoryType) {
  const wb = XLSX.utils.book_new()
  const wsDeploy = XLSX.utils.aoa_to_sheet(buildDeploymentSheetRows(category))
  XLSX.utils.book_append_sheet(wb, wsDeploy, `${category}_Deployments`)
  XLSX.writeFile(wb, `DepEd_${category}_Deployments_${getDateStamp()}.xlsx`)
}

export function parseCategoryWorkbook(
  data: ArrayBuffer,
  category: CategoryType
): { rows: ParsedImportRow[]; error?: string } {
  const workbook = XLSX.read(data, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) {
    return { rows: [], error: 'No sheets found in workbook.' }
  }
  const worksheet = workbook.Sheets[sheetName]
  if (!worksheet) {
    return { rows: [], error: 'The selected worksheet could not be read.' }
  }
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][]

  if (!jsonData || jsonData.length < 2) {
    return { rows: [], error: 'The selected file is empty or missing data rows.' }
  }

  const rawHeaders = (jsonData[0] || []).map((h) => String(h || '').trim().toLowerCase())

  const schoolNameIdx = rawHeaders.findIndex(
    (h) => h.includes('school') && (h.includes('name') || !h.includes('id'))
  )
  const schoolIdIdx = rawHeaders.findIndex((h) => h.includes('id') || h.includes('school id'))

  const subjects =
    category === 'JHS'
      ? (JHS_SUBJECTS as readonly string[])
      : category === 'SHS'
      ? (SHS_SUBJECTS as readonly string[])
      : []

  // Map subject columns if category is JHS or SHS
  const subjectColMap: Record<string, { reqIdx: number; existIdx: number }> = {}
  if (subjects.length > 0) {
    subjects.forEach((subj) => {
      const sLower = subj.toLowerCase()
      const reqIdx = rawHeaders.findIndex(
        (h) => h.includes(sLower) && (h.includes('req') || h.includes('required'))
      )
      const existIdx = rawHeaders.findIndex(
        (h) => h.includes(sLower) && (h.includes('exist') || h.includes('existing'))
      )
      subjectColMap[subj] = { reqIdx, existIdx }
    })
  }

  const hasSubjectCols =
    subjects.length > 0 &&
    Object.values(subjectColMap).some((m) => m.reqIdx !== -1 || m.existIdx !== -1)

  const reqIdx = rawHeaders.findIndex((h) => h === 'required' || h === 'req' || h.includes('required'))
  const existIdx = rawHeaders.findIndex((h) => h === 'existing' || h === 'exist' || h.includes('existing'))
  const tOutIdx = rawHeaders.findIndex(
    (h) => h.includes('out') || h.includes('t-out') || h.includes('transfer out')
  )
  const tInIdx = rawHeaders.findIndex(
    (h) => h.includes('in') || h.includes('t-in') || h.includes('transfer in')
  )

  const parsed: ParsedImportRow[] = []

  for (let i = 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (!row || row.length === 0) continue

    const sName =
      schoolNameIdx !== -1 ? String(row[schoolNameIdx] || '').trim() : String(row[1] || '').trim()
    const sId =
      schoolIdIdx !== -1 ? String(row[schoolIdIdx] || '').trim() : String(row[0] || '').trim()

    if (!sName && !sId) continue

    if (hasSubjectCols) {
      const reqBySubj: Record<string, number> = {}
      const existBySubj: Record<string, number> = {}
      let totalReq = 0
      let totalExist = 0

      subjects.forEach((subj) => {
        const map = subjectColMap[subj]
        const rVal = map && map.reqIdx !== -1 ? Number(row[map.reqIdx]) || 0 : 0
        const eVal = map && map.existIdx !== -1 ? Number(row[map.existIdx]) || 0 : 0
        reqBySubj[subj] = rVal
        existBySubj[subj] = eVal
        totalReq += rVal
        totalExist += eVal
      })

      parsed.push({
        schoolId: sId,
        schoolName: sName,
        required: totalReq,
        existing: totalExist,
        transferOut: 0,
        transferIn: 0,
        requiredBySubject: reqBySubj,
        existingBySubject: existBySubj,
      })
    } else {
      parsed.push({
        schoolId: sId,
        schoolName: sName,
        required: reqIdx !== -1 ? Number(row[reqIdx]) || 0 : Number(row[2]) || 0,
        existing: existIdx !== -1 ? Number(row[existIdx]) || 0 : Number(row[3]) || 0,
        transferOut: tOutIdx !== -1 ? Number(row[tOutIdx]) || 0 : Number(row[4]) || 0,
        transferIn: tInIdx !== -1 ? Number(row[tInIdx]) || 0 : Number(row[5]) || 0,
      })
    }
  }

  return { rows: parsed }
}
