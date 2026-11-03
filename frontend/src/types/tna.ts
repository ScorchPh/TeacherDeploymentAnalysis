export interface EsRecord {
  id: string
  schoolId: string
  schoolName: string
  required: number
  existing: number
  transferOut: number
  transferIn: number
}

export type JhsSubject = string

export const JHS_SUBJECTS: string[] = [
  'Filipino',
  'English',
  'Math',
  'Science',
  'AralPan',
  'TLE',
  'MAPEH',
  'EsP',
  'SPED',
]

export interface JhsRecord {
  id: string
  schoolId: string
  schoolName: string
  required: Record<string, number>
  existing: Record<string, number>
  transferOut: Record<string, number>
  transferIn: Record<string, number>
}

export type ShsSubject = string

export const SHS_SUBJECTS: string[] = [
  'ABM',
  'AralPan',
  'English',
  'Filipino',
  'MAPEH',
  'Math',
  'Science',
  'TVL-AFA',
  'TVL-HE',
  'TVL-IA',
  'TVL-ICT',
]

export interface ShsRecord {
  id: string
  schoolId: string
  schoolName: string
  required: Record<string, number>
  existing: Record<string, number>
  transferOut: Record<string, number>
  transferIn: Record<string, number>
}

export type CategoryType = 'ES' | 'JHS' | 'SHS'

export type TransferType = 'IN' | 'OUT'

/**
 * A single teacher movement entry from the Deployment tab.
 * Each record adds 1 to the target school's Transfer In or Transfer Out
 * (and to the selected subject for JHS / SHS).
 */
export interface DeploymentRecord {
  id: string
  category: CategoryType
  lastName: string
  firstName: string
  middleName: string
  schoolName: string
  toSchoolName?: string
  currentPosition: string
  dateAdded: string
  transferType: TransferType
  subject?: JhsSubject | ShsSubject
}
