// Database types for therapy practice management

export interface Therapist {
  id: string
  name: string
  created_at: string
  updated_at: string
  reminder_message_template?: string
  reminder_api_key?: string
  ical_feed_url?: string
}

export interface Client {
  id: string
  therapist_id: string
  name: string
  therapynotes_patient_id?: number
  therapynotes_encrypted_patient_id?: string
  phone_number?: string
  calendar_nickname?: string
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  therapist_id: string
  client_id: string
  date: string
  start_time: string
  end_time: string
  created_at: string
  updated_at: string
  recurring_group_id?: string
  recurring_frequency?: 'weekly' | 'biweekly' | 'every4weeks'
  recurring_end_date?: string
  synced_to_therapynotes?: boolean
  therapynotes_calendar_entry_id?: string
  therapynotes_encrypted_calendar_entry_id?: string
  has_progress_note?: boolean
  progress_note_synced?: boolean
  clients?: {
    id: string
    name: string
  }
}

export interface ProgressNoteContent {
  // Billing codes
  billingCodes?: {
    code: string
    text: string
  }[]
  // Diagnosis (supports single or array for backward compatibility)
  diagnosis?: {
    code: string
    description: string
  }
  diagnoses?: {
    code: string
    description: string
  }[]
  // Mental Status Examination
  mentalStatus?: Record<string, string>
  // Risk Assessment
  riskAssessment?: {
    patientDeniesRisk: boolean
    areaOfRisk?: string
    levelOfRisk?: string
    intentToAct?: string
    planToAct?: string
    meansToAct?: string
    riskFactors?: string
    protectiveFactors?: string
    additionalDetails?: string
  }
  // Clinical Content
  medications?: string
  subjectiveReport?: string
  objectiveContent?: string
  interventions?: string[]
  treatmentProgress?: string
  treatmentObjectivesDetailed?: {
    Id: number
    TreatmentObjectiveDescription: string
  }[]
  // Assessment & Plan
  assessment?: string
  plan?: string
  // Recommendation
  recommendation?: {
    type: string
    prescribedFrequency: string
  }
  // Crisis session duration (for 90840 add-on code)
  crisisSessionDuration?: number
  // Telephone service duration (for 98966-98968 codes)
  phoneDuration?: number
}

export interface ProgressNote {
  id: string
  therapist_id: string
  session_id: string
  content: ProgressNoteContent
  synced_to_therapynotes: boolean
  created_at: string
  updated_at: string
}

// API request/response types
export interface CreateClientRequest {
  name: string
  phone_number?: string
}

export interface UpdateClientRequest {
  name: string
  phone_number?: string | null
}

export interface CreateSessionRequest {
  client_id: string
  date: string
  start_time: string
  end_time: string
  is_recurring?: boolean
  recurring_frequency?: 'weekly' | 'biweekly' | 'every4weeks'
  recurring_end_date?: string
  recurring_group_id?: string
}

export interface UpdateSessionRequest {
  client_id: string
  date: string
  start_time: string
  end_time: string
  update_scope?: 'single' | 'all_future'
  recurring_frequency?: 'weekly' | 'biweekly' | 'every4weeks'
  recurring_end_date?: string
  recurring_group_id?: string
}

export interface CreateNoteRequest {
  session_id: string
  content: Record<string, unknown>
}

export interface UpdateNoteRequest {
  content: Record<string, unknown>
  synced_to_therapynotes?: boolean
}

// API response types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  limit: number
}

// Calendar import types
export interface CalendarEvent {
  uid: string
  title: string
  start: string
  end: string
}

export interface CalendarEventWithMapping extends CalendarEvent {
  selected: boolean
  matchedClientId?: string
  matchedClientName?: string
}

// TherapyNotes ERA Billing Report types
export interface SessionBillingData {
  serviceDate: string // MM/DD/YYYY format
  clientName: string // Properly capitalized patient name
  serviceCode: string // CPT code (e.g., 90837, 90785, 90791)
  chargedAmount: number // Amount billed to insurance
  insurancePaid: number // Amount paid by insurance
  patientResponsibility: number // chargedAmount - insurancePaid
  payerName: string // Insurance company name
  eraId: number // ERA ID from TherapyNotes
}

// TherapyNotes Schedule Session types
export interface ScheduleSession {
  id: number // Calendar entry ID
  date: string // MM/DD/YYYY format
  time: string // HH:MM AM/PM format
  startDateTime: string // ISO datetime for sorting
  clientName: string // Patient name
  clientId: number // Patient ID
  sessionType: string // e.g., "Therapy Session", "Therapy Intake"
  serviceCode: string // e.g., "90837"
  status: number // 1 = confirmed, 3 = cancelled
}

// Combined schedule + billing row
export interface CombinedSessionRow {
  // Schedule data (left side)
  schedule: ScheduleSession | null
  // Billing data (right side) - may have multiple services per session (e.g., 90837 + 90785)
  billing: SessionBillingData[]
  // Match status
  hasSchedule: boolean
  hasBilling: boolean
}

export interface CombinedReportData {
  rows: CombinedSessionRow[]
  scheduleSessions: ScheduleSession[]
  billingSessions: SessionBillingData[]
  totals: {
    totalCharged: number
    totalInsurancePaid: number
    totalPatientResponsibility: number
    totalScheduledSessions: number
    totalBilledServices: number
    matchedSessions: number
    unmatchedSchedule: number
    unmatchedBilling: number
  }
  filters: {
    clients: string[]
    codes: string[]
    payers: string[]
  }
  dateRange: {
    start: string
    end: string
  }
}

export interface BillingReportData {
  sessions: SessionBillingData[]
  totals: {
    totalCharged: number
    totalInsurancePaid: number
    totalPatientResponsibility: number
    sessionCount: number
  }
  filters: {
    clients: string[]
    codes: string[]
    payers: string[]
  }
  dateRange: {
    start: string
    end: string
  }
}
