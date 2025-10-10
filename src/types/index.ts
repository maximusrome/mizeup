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
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
  created_at: string
  updated_at: string
  recurring_group_id?: string
  recurring_frequency?: 'weekly' | 'biweekly' | 'every4weeks'
  recurring_end_date?: string
  synced_to_therapynotes?: boolean
  has_progress_note?: boolean
  clients?: {
    id: string
    name: string
  }
}

export interface ProgressNote {
  id: string
  therapist_id: string
  session_id: string
  content: Record<string, unknown> // JSONB content
  status: 'draft' | 'completed'
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
  notes?: string
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
  status?: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  notes?: string
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
  status?: 'draft' | 'completed'
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
