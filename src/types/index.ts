// Database types for therapy practice management

export interface Therapist {
  id: string
  name: string
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  therapist_id: string
  name: string
  therapynotes_encrypted_patient_id?: string
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
  // Assessment & Plan
  assessment?: string
  plan?: string
  // Recommendation
  recommendation?: {
    type: string
    prescribedFrequency: string
  }
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
}

export interface UpdateClientRequest {
  name: string
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
