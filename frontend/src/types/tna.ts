export interface EsRecord {
  id: string
  schoolId: string
  schoolName: string
  required: number
  existing: number
  baseExisting?: number
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
  baseExisting?: Record<string, number>
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
  baseExisting?: Record<string, number>
  transferOut: Record<string, number>
  transferIn: Record<string, number>
}

export type CategoryType = 'ES' | 'JHS' | 'SHS'

export type TransferType = 'IN' | 'OUT'

/**
 * A teacher transfer between two schools (From School -> To School).
 * Adds +1 to From School Transfer Out and +1 to To School Transfer In.
 */
export interface DeploymentRecord {
  id: string
  category: CategoryType
  lastName: string
  firstName: string
  middleName: string
  schoolName: string // Origin / From School (Transfer Out)
  toSchoolName?: string // Destination / To School (Transfer In)
  currentPosition: string
  dateAdded: string
  transferType?: TransferType
  subject?: JhsSubject | ShsSubject
  remarks?: string
}

export type TransferRecord = DeploymentRecord

/**
 * An Assignment Advice for a newly hired or newly assigned teacher.
 * Directly increments the target school's Existing teacher count (+1 Existing).
 */
export interface AssignmentAdviceRecord {
  id: string
  category: CategoryType
  lastName: string
  firstName: string
  middleName: string
  schoolName: string // Target school where teacher is assigned
  currentPosition: string
  dateAdded: string
  subject?: JhsSubject | ShsSubject // Subject area for JHS & SHS
  remarks?: string
}
