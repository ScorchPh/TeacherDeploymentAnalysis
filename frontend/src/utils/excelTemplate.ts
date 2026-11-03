import * as XLSX from 'xlsx'
import type { CategoryType } from '../types/tna'
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
  const wb = XLSX.utils.book_new()

  if (category === 'ES') {
    const row1 = ['SCHOOL INFO', '', 'TEACHER NEEDS ANALYSIS', '']
    const row2 = ['School ID', 'School Name', 'Required', 'Existing']
    const ws = XLSX.utils.aoa_to_sheet([row1, row2])
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 0, c: 3 } },
    ]
    ws['!cols'] = [{ wch: 14 }, { wch: 26 }, { wch: 14 }, { wch: 14 }]
    XLSX.utils.book_append_sheet(wb, ws, 'ES_Template')
  } else {
    const subjects = category === 'JHS' ? tnaStore.jhsSubjects : tnaStore.shsSubjects
    const subjCount = subjects.length
    const reqTitle =
      category === 'JHS'
        ? 'REQUIRED TEACHERS PER SUBJECT'
        : 'REQUIRED TEACHERS PER SUBJECT / TRACK'
    const existTitle =
      category === 'JHS'
        ? 'EXISTING TEACHERS PER SUBJECT'
        : 'EXISTING TEACHERS PER SUBJECT / TRACK'

    const row1: string[] = ['SCHOOL INFO', '']
    const row2: string[] = ['School ID', 'School Name']

    // Required group
    row1.push(reqTitle, ...Array(Math.max(0, subjCount - 1)).fill(''))
    row2.push(...subjects)

    // Existing group
    row1.push(existTitle, ...Array(Math.max(0, subjCount - 1)).fill(''))
    row2.push(...subjects)

    const ws = XLSX.utils.aoa_to_sheet([row1, row2])
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 0, c: 2 + subjCount - 1 } },
      { s: { r: 0, c: 2 + subjCount }, e: { r: 0, c: 2 + subjCount * 2 - 1 } },
    ]
    ws['!cols'] = row2.map((h, idx) => ({
      wch: idx === 0 ? 14 : idx === 1 ? 26 : Math.max(h.length + 4, 11),
    }))
    XLSX.utils.book_append_sheet(wb, ws, `${category}_Template`)
  }

  XLSX.writeFile(wb, `DepEd_${category}_TNA_Template.xlsx`)
}

function buildDeploymentWorksheet(category: CategoryType): XLSX.WorkSheet {
  const isSubjectLevel = category !== 'ES'
  const colCount = isSubjectLevel ? 9 : 8
  const records = tnaStore.deploymentRecords.filter((d) => d.category === category)

  interface SchoolDeployEntry {
    lastName: string
    firstName: string
    middleName: string
    schoolDisplay: string
    subject: string
    currentPosition: string
    dateAdded: string
    transferLabel: string
  }

  // Group records by school (only schools with at least 1 deployment record)
  const schoolMap = new Map<string, SchoolDeployEntry[]>()

  const addEntry = (schoolName: string, entry: SchoolDeployEntry) => {
    const clean = schoolName.trim()
    if (!clean) return
    if (!schoolMap.has(clean)) {
      schoolMap.set(clean, [])
    }
    schoolMap.get(clean)!.push(entry)
  }

  records.forEach((d) => {
    if (d.transferType === 'IN') {
      addEntry(d.schoolName, {
        lastName: d.lastName,
        firstName: d.firstName,
        middleName: d.middleName || '—',
        schoolDisplay: d.schoolName,
        subject: d.subject || '—',
        currentPosition: d.currentPosition || '—',
        dateAdded: d.dateAdded || '—',
        transferLabel: 'Transfer In',
      })
    } else {
      const routeDisplay = d.toSchoolName
        ? `${d.schoolName} → ${d.toSchoolName}`
        : d.schoolName
      addEntry(d.schoolName, {
        lastName: d.lastName,
        firstName: d.firstName,
        middleName: d.middleName || '—',
        schoolDisplay: routeDisplay,
        subject: d.subject || '—',
        currentPosition: d.currentPosition || '—',
        dateAdded: d.dateAdded || '—',
        transferLabel: 'Transfer Out',
      })
      if (d.toSchoolName && d.toSchoolName.trim() !== d.schoolName.trim()) {
        addEntry(d.toSchoolName, {
          lastName: d.lastName,
          firstName: d.firstName,
          middleName: d.middleName || '—',
          schoolDisplay: routeDisplay,
          subject: d.subject || '—',
          currentPosition: d.currentPosition || '—',
          dateAdded: d.dateAdded || '—',
          transferLabel: `Transfer In (From ${d.schoolName})`,
        })
      }
    }
  })

  const rows: (string | number)[][] = []
  const merges: XLSX.Range[] = []

  const sortedSchools = Array.from(schoolMap.keys()).sort((a, b) => a.localeCompare(b))

  if (sortedSchools.length === 0) {
    rows.push(['No deployment records found for this level.'])
    return XLSX.utils.aoa_to_sheet(rows)
  }

  sortedSchools.forEach((schoolName, schoolIdx) => {
    const entries = schoolMap.get(schoolName) || []
    if (entries.length === 0) return

    // 1. School Title Banner Row
    const titleRowIdx = rows.length
    const titleRow: string[] = [schoolName, ...Array(colCount - 1).fill('')]
    rows.push(titleRow)
    merges.push({
      s: { r: titleRowIdx, c: 0 },
      e: { r: titleRowIdx, c: colCount - 1 },
    })

    // 2. Table Header Row 1 & Row 2 (matching DeploymentTab UI)
    const headRow1Idx = rows.length
    const headRow2Idx = rows.length + 1

    if (isSubjectLevel) {
      rows.push([
        'NO.',
        'NAME OF APPLICANT',
        '',
        '',
        'SCHOOL',
        'SUBJECT',
        'CURRENT POSITION',
        'DATE ADDED',
        'TRANSFER',
      ])
      rows.push(['', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME', '', '', '', '', ''])

      merges.push(
        { s: { r: headRow1Idx, c: 0 }, e: { r: headRow2Idx, c: 0 } }, // NO.
        { s: { r: headRow1Idx, c: 1 }, e: { r: headRow1Idx, c: 3 } }, // NAME OF APPLICANT
        { s: { r: headRow1Idx, c: 4 }, e: { r: headRow2Idx, c: 4 } }, // SCHOOL
        { s: { r: headRow1Idx, c: 5 }, e: { r: headRow2Idx, c: 5 } }, // SUBJECT
        { s: { r: headRow1Idx, c: 6 }, e: { r: headRow2Idx, c: 6 } }, // CURRENT POSITION
        { s: { r: headRow1Idx, c: 7 }, e: { r: headRow2Idx, c: 7 } }, // DATE ADDED
        { s: { r: headRow1Idx, c: 8 }, e: { r: headRow2Idx, c: 8 } } // TRANSFER
      )
    } else {
      rows.push([
        'NO.',
        'NAME OF APPLICANT',
        '',
        '',
        'SCHOOL',
        'CURRENT POSITION',
        'DATE ADDED',
        'TRANSFER',
      ])
      rows.push(['', 'LAST NAME', 'FIRST NAME', 'MIDDLE NAME', '', '', '', ''])

      merges.push(
        { s: { r: headRow1Idx, c: 0 }, e: { r: headRow2Idx, c: 0 } }, // NO.
        { s: { r: headRow1Idx, c: 1 }, e: { r: headRow1Idx, c: 3 } }, // NAME OF APPLICANT
        { s: { r: headRow1Idx, c: 4 }, e: { r: headRow2Idx, c: 4 } }, // SCHOOL
        { s: { r: headRow1Idx, c: 5 }, e: { r: headRow2Idx, c: 5 } }, // CURRENT POSITION
        { s: { r: headRow1Idx, c: 6 }, e: { r: headRow2Idx, c: 6 } }, // DATE ADDED
        { s: { r: headRow1Idx, c: 7 }, e: { r: headRow2Idx, c: 7 } } // TRANSFER
      )
    }

    // 3. Data rows for this school
    entries.forEach((e, idx) => {
      if (isSubjectLevel) {
        rows.push([
          idx + 1,
          e.lastName,
          e.firstName,
          e.middleName,
          e.schoolDisplay,
          e.subject,
          e.currentPosition,
          e.dateAdded,
          e.transferLabel,
        ])
      } else {
        rows.push([
          idx + 1,
          e.lastName,
          e.firstName,
          e.middleName,
          e.schoolDisplay,
          e.currentPosition,
          e.dateAdded,
          e.transferLabel,
        ])
      }
    })

    // 4. Blank separator row between schools
    if (schoolIdx < sortedSchools.length - 1) {
      rows.push([])
    }
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!merges'] = merges
  ws['!cols'] = isSubjectLevel
    ? [
        { wch: 6 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 28 },
        { wch: 14 },
        { wch: 20 },
        { wch: 14 },
        { wch: 24 },
      ]
    : [
        { wch: 6 },
        { wch: 18 },
        { wch: 18 },
        { wch: 16 },
        { wch: 28 },
        { wch: 20 },
        { wch: 14 },
        { wch: 24 },
      ]

  return ws
}

/**
 * Exports a complete backup Excel file matching the exact layout of the UI table
 * (with merged category headers, subject columns + TOTAL columns, and bottom summary row)
 * as well as the current Deployment records for that category.
 */
export function exportCategoryBackupExcel(category: CategoryType) {
  const wb = XLSX.utils.book_new()

  if (category === 'ES') {
    const row1 = [
      'SCHOOL INFO',
      '',
      'ELEMENTARY SCHOOL TEACHER NEEDS ANALYSIS',
      '',
      '',
      '',
      '',
      '',
    ]
    const row2 = [
      'School ID',
      'School Name',
      'Required',
      'Existing',
      'GAP',
      'Transfer Out',
      'Transfer In',
      'Needs',
    ]
    const analysisRows: (string | number)[][] = [row1, row2]

    let totReq = 0
    let totExist = 0
    let totGap = 0
    let totOut = 0
    let totIn = 0
    let totNeeds = 0

    tnaStore.esRecords.forEach((r) => {
      const gap = tnaStore.calcEsGap(r)
      const needs = tnaStore.calcEsNeeds(r)
      totReq += r.required
      totExist += r.existing
      totGap += gap
      totOut += r.transferOut
      totIn += r.transferIn
      totNeeds += needs

      analysisRows.push([
        r.schoolId,
        r.schoolName,
        r.required,
        r.existing,
        gap,
        r.transferOut,
        r.transferIn,
        needs,
      ])
    })

    analysisRows.push([
      '',
      `TOTAL (${tnaStore.esRecords.length} Schools)`,
      totReq,
      totExist,
      totGap,
      totOut,
      totIn,
      totNeeds,
    ])

    const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisRows)
    wsAnalysis['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
      { s: { r: 0, c: 2 }, e: { r: 0, c: 7 } },
    ]
    wsAnalysis['!cols'] = [
      { wch: 14 },
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
    ]
    XLSX.utils.book_append_sheet(wb, wsAnalysis, 'ES_Needs_Backup')
  } else {
    const isJhs = category === 'JHS'
    const subjects = isJhs ? tnaStore.jhsSubjects : tnaStore.shsSubjects
    const records = isJhs ? tnaStore.jhsRecords : tnaStore.shsRecords
    const groupSpan = subjects.length + 1 // subjects + TOTAL

    const groupTitles = [
      isJhs ? 'REQUIRED TEACHERS PER SUBJECT' : 'REQUIRED TEACHERS PER SUBJECT / TRACK',
      isJhs ? 'EXISTING TEACHERS PER SUBJECT' : 'EXISTING TEACHERS PER SUBJECT / TRACK',
      'GAP (REQ - EXIST)',
      'TRANSFERS OUT',
      'TRANSFERS IN',
      'NEEDS ((GAP + T-OUT) - T-IN)',
    ]

    const row1: string[] = ['SCHOOL INFO', '']
    const row2: string[] = ['School ID', 'School Name']
    const merges: XLSX.Range[] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }]

    let currentCol = 2
    groupTitles.forEach((title) => {
      row1.push(title, ...Array(Math.max(0, groupSpan - 1)).fill(''))
      row2.push(...subjects, 'TOTAL')
      merges.push({
        s: { r: 0, c: currentCol },
        e: { r: 0, c: currentCol + groupSpan - 1 },
      })
      currentCol += groupSpan
    })

    const analysisRows: (string | number)[][] = [row1, row2]
    const colTotals: number[] = Array(groupTitles.length * groupSpan).fill(0)

    records.forEach((r) => {
      const row: (string | number)[] = [r.schoolId, r.schoolName]
      const numericVals: number[] = []

      // 1. Required
      let sumReq = 0
      subjects.forEach((s) => {
        const v = r.required[s] || 0
        sumReq += v
        numericVals.push(v)
      })
      numericVals.push(sumReq)

      // 2. Existing
      let sumExist = 0
      subjects.forEach((s) => {
        const v = r.existing[s] || 0
        sumExist += v
        numericVals.push(v)
      })
      numericVals.push(sumExist)

      // 3. GAP
      let sumGap = 0
      subjects.forEach((s) => {
        const v = (r.required[s] || 0) - (r.existing[s] || 0)
        sumGap += v
        numericVals.push(v)
      })
      numericVals.push(sumGap)

      // 4. Transfers Out
      let sumOut = 0
      subjects.forEach((s) => {
        const v = r.transferOut[s] || 0
        sumOut += v
        numericVals.push(v)
      })
      numericVals.push(sumOut)

      // 5. Transfers In
      let sumIn = 0
      subjects.forEach((s) => {
        const v = r.transferIn[s] || 0
        sumIn += v
        numericVals.push(v)
      })
      numericVals.push(sumIn)

      // 6. Needs
      let sumNeeds = 0
      subjects.forEach((s) => {
        const gap = (r.required[s] || 0) - (r.existing[s] || 0)
        const v = gap + (r.transferOut[s] || 0) - (r.transferIn[s] || 0)
        sumNeeds += v
        numericVals.push(v)
      })
      numericVals.push(sumNeeds)

      numericVals.forEach((v, i) => {
        colTotals[i] = (colTotals[i] || 0) + v
        row.push(v)
      })

      analysisRows.push(row)
    })

    // Add bottom TOTAL row
    analysisRows.push(['', `TOTAL (${records.length} Schools)`, ...colTotals])

    const wsAnalysis = XLSX.utils.aoa_to_sheet(analysisRows)
    wsAnalysis['!merges'] = merges
    wsAnalysis['!cols'] = row2.map((h, idx) => ({
      wch: idx === 0 ? 14 : idx === 1 ? 28 : Math.max(h.length + 3, 10),
    }))
    XLSX.utils.book_append_sheet(wb, wsAnalysis, `${category}_Needs_Backup`)
  }

  const wsDeploy = buildDeploymentWorksheet(category)
  XLSX.utils.book_append_sheet(wb, wsDeploy, `${category}_Deployments_Backup`)

  XLSX.writeFile(wb, `DepEd_${category}_Backup_${getDateStamp()}.xlsx`)
}

/**
 * Exports only the Deployment records for the given category to Excel.
 */
export function exportDeploymentsExcel(category: CategoryType) {
  const wb = XLSX.utils.book_new()
  const wsDeploy = buildDeploymentWorksheet(category)
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

  const row0 = (jsonData[0] || []).map((h) => String(h || '').trim())
  const row1 = (jsonData[1] || []).map((h) => String(h || '').trim())

  // Detect if workbook uses 2-row grouped headers (like the UI table / Export Backup / Template)
  const isTwoRowGroupedHeader =
    row0.some(
      (h) =>
        h.toLowerCase().includes('school info') ||
        h.toLowerCase().includes('required teachers') ||
        h.toLowerCase().includes('required number') ||
        h.toLowerCase().includes('teacher needs analysis')
    ) ||
    row1.some(
      (h) =>
        h.toLowerCase() === 'school id' ||
        h.toLowerCase() === 'school name' ||
        h.toLowerCase() === 'filipino' ||
        h.toLowerCase() === 'abm'
    )

  let originalHeaders: string[] = []
  let dataStartIdx = 1

  if (isTwoRowGroupedHeader) {
    dataStartIdx = 2
    const maxCols = Math.max(row0.length, row1.length)
    let activeGroup = ''

    for (let c = 0; c < maxCols; c++) {
      if (row0[c]) {
        activeGroup = row0[c]!
      }
      const gLower = activeGroup.toLowerCase()
      const sub = row1[c] || ''
      const subLower = sub.toLowerCase()

      if (!sub && row0[c] && row0[c]!.toLowerCase() === 'school') {
        originalHeaders.push('School Name')
      } else if (
        subLower === 'school id' ||
        subLower === 'school name' ||
        subLower === 'total' ||
        category === 'ES'
      ) {
        originalHeaders.push(sub)
      } else if (sub) {
        if (gLower.includes('required')) {
          originalHeaders.push(`${sub} Required`)
        } else if (gLower.includes('existing')) {
          originalHeaders.push(`${sub} Existing`)
        } else if (gLower.includes('gap')) {
          originalHeaders.push(`${sub} GAP`)
        } else if (gLower.includes('out')) {
          originalHeaders.push(`${sub} T-Out`)
        } else if (gLower.includes('transfer') && gLower.includes('in')) {
          originalHeaders.push(`${sub} T-In`)
        } else if (gLower.includes('needs')) {
          originalHeaders.push(`${sub} Needs`)
        } else {
          originalHeaders.push(sub)
        }
      } else {
        originalHeaders.push('')
      }
    }
  } else {
    originalHeaders = row0
    dataStartIdx = 1
  }

  const rawHeaders = originalHeaders.map((h) => h.toLowerCase())

  const schoolNameIdx = rawHeaders.findIndex(
    (h) => h.includes('school') && (h.includes('name') || !h.includes('id'))
  )
  const schoolIdIdx = rawHeaders.findIndex((h) => h.includes('id') || h.includes('school id'))

  if (category === 'JHS' || category === 'SHS') {
    // Auto-detect any new "<Subject> Required" or "<Subject> Req" columns in the Excel file
    originalHeaders.forEach((origH) => {
      const match = origH.match(/^(.+?)\s+(required|req)$/i)
      if (match && match[1]) {
        const candidate = match[1].trim()
        if (
          candidate &&
          candidate.toLowerCase() !== 'total' &&
          !candidate.toLowerCase().includes('school')
        ) {
          tnaStore.addSubject(category, candidate)
        }
      }
    })
  }

  const subjects =
    category === 'JHS'
      ? tnaStore.jhsSubjects
      : category === 'SHS'
      ? tnaStore.shsSubjects
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

  for (let i = dataStartIdx; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (!row || row.length === 0) continue

    const sName =
      schoolNameIdx !== -1 ? String(row[schoolNameIdx] || '').trim() : String(row[1] || '').trim()
    const sId =
      schoolIdIdx !== -1 ? String(row[schoolIdIdx] || '').trim() : String(row[0] || '').trim()

    if (!sName && !sId) continue
    if (
      sName.toUpperCase().startsWith('TOTAL') ||
      sId.toUpperCase().startsWith('TOTAL') ||
      sName.toUpperCase().includes('NEW SHS ITEMS')
    ) {
      continue
    }

    if (hasSubjectCols) {
      const reqBySubj: Record<string, number> = {}
      const existBySubj: Record<string, number> = {}
      let totalReq = 0
      let totalExist = 0

      subjects.forEach((subj) => {
        const map = subjectColMap[subj]
        const rVal = map && map.reqIdx !== -1 ? Math.round(Number(row[map.reqIdx]) || 0) : 0
        const eVal = map && map.existIdx !== -1 ? Math.round(Number(row[map.existIdx]) || 0) : 0
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
        required: reqIdx !== -1 ? Math.round(Number(row[reqIdx]) || 0) : Math.round(Number(row[2]) || 0),
        existing: existIdx !== -1 ? Math.round(Number(row[existIdx]) || 0) : Math.round(Number(row[3]) || 0),
        transferOut: tOutIdx !== -1 ? Math.round(Number(row[tOutIdx]) || 0) : Math.round(Number(row[4]) || 0),
        transferIn: tInIdx !== -1 ? Math.round(Number(row[tInIdx]) || 0) : Math.round(Number(row[5]) || 0),
      })
    }
  }

  return { rows: parsed }
}
