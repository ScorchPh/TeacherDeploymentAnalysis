export interface EsRecord {
  id: string
  schoolId: string
  schoolName: string
  required: number
  existing: number
  transferOut: number
  transferIn: number
}

export type JhsSubject =
  | 'Filipino'
  | 'English'
  | 'Math'
  | 'Science'
  | 'AralPan'
  | 'TLE'
  | 'MAPEH'
  | 'EsP'
  | 'SPED'

export const JHS_SUBJECTS: JhsSubject[] = [
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
  required: Record<JhsSubject, number>
  existing: Record<JhsSubject, number>
  transferOut: Record<JhsSubject, number>
  transferIn: Record<JhsSubject, number>
}

export type ShsSubject =
  | 'ABM'
  | 'AralPan'
  | 'English'
  | 'Filipino'
  | 'Math'
  | 'Science'
  | 'TVL-AFA'
  | 'TVL-HE'
  | 'TVL-IA'
  | 'TVL-ICT'

export const SHS_SUBJECTS: ShsSubject[] = [
  'ABM',
  'AralPan',
  'English',
  'Filipino',
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
  required: Record<ShsSubject, number>
  existing: Record<ShsSubject, number>
  transferOut: Record<ShsSubject, number>
  transferIn: Record<ShsSubject, number>
}

export type CategoryType = 'ES' | 'JHS' | 'SHS'
