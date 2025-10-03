import { createClient as createSupabaseClient } from '@/utils/supabase/server'
import type { 
  Therapist, 
  Client, 
  Session, 
  ProgressNote,
  CreateClientRequest,
  UpdateClientRequest,
  CreateSessionRequest,
  UpdateSessionRequest,
  CreateNoteRequest,
  UpdateNoteRequest
} from '@/types'

// Get the authenticated user
async function getCurrentUser() {
  const supabase = await createSupabaseClient()
  const { data, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Auth error:', error)
    throw new Error('Authentication error')
  }
  
  if (!data?.user) {
    throw new Error('No authenticated user')
  }
  
  return data.user
}

// Ensure therapist exists in database
async function ensureTherapistExists(user: { id: string; user_metadata?: { full_name?: string }; email?: string }): Promise<void> {
  const supabase = await createSupabaseClient()
  
  // Check if therapist exists
  const { data: existingTherapist } = await supabase
    .from('therapists')
    .select('id')
    .eq('id', user.id)
    .single()
  
  // If therapist doesn't exist, create one
  if (!existingTherapist) {
    const { error } = await supabase
      .from('therapists')
      .insert({
        id: user.id,
        name: user.user_metadata?.full_name || user.email || 'Therapist'
      })
    
    if (error) {
      console.error('Error creating therapist:', error)
      throw new Error('Failed to create therapist profile')
    }
  }
}

// THERAPIST FUNCTIONS
export async function getTherapist(): Promise<Therapist> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('therapists')
    .select('*')
    .eq('id', user.id)
    .single()
  
  if (error) {
    throw new Error(`Failed to get therapist: ${error.message}`)
  }
  
  return data
}

export async function createTherapist(name: string): Promise<Therapist> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('therapists')
    .insert({
      id: user.id,
      name
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create therapist: ${error.message}`)
  }
  
  return data
}

// CLIENT FUNCTIONS
export async function getClients(): Promise<Client[]> {
  const user = await getCurrentUser()
  await ensureTherapistExists(user)
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('therapist_id', user.id)
    .order('name')
  
  if (error) {
    throw new Error(`Failed to get clients: ${error.message}`)
  }
  
  return data || []
}

export async function getClient(id: string): Promise<Client> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('id', id)
    .eq('therapist_id', user.id)
    .single()
  
  if (error) {
    throw new Error(`Failed to get client: ${error.message}`)
  }
  
  return data
}

export async function createClient(request: CreateClientRequest): Promise<Client> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('clients')
    .insert({
      therapist_id: user.id,
      name: request.name
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create client: ${error.message}`)
  }
  
  return data
}

export async function updateClient(id: string, request: UpdateClientRequest): Promise<Client> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('clients')
    .update({
      name: request.name,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('therapist_id', user.id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update client: ${error.message}`)
  }
  
  return data
}

export async function deleteClient(id: string): Promise<void> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { error } = await supabase
    .from('clients')
    .delete()
    .eq('id', id)
    .eq('therapist_id', user.id)
  
  if (error) {
    throw new Error(`Failed to delete client: ${error.message}`)
  }
}

// SESSION FUNCTIONS
export async function getSessions(date?: string): Promise<Session[]> {
  const user = await getCurrentUser()
  await ensureTherapistExists(user)
  const supabase = await createSupabaseClient()
  
  let query = supabase
    .from('sessions')
    .select(`
      *,
      clients:client_id (
        id,
        name
      )
    `)
    .eq('therapist_id', user.id)
    .order('date', { ascending: true })
    .order('start_time', { ascending: true })
  
  if (date) {
    query = query.eq('date', date)
  }
  
  const { data, error } = await query
  
  if (error) {
    throw new Error(`Failed to get sessions: ${error.message}`)
  }
  
  return data || []
}

export async function getSession(id: string): Promise<Session> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      clients:client_id (
        id,
        name
      )
    `)
    .eq('id', id)
    .eq('therapist_id', user.id)
    .single()
  
  if (error) {
    throw new Error(`Failed to get session: ${error.message}`)
  }
  
  return data
}

export async function createSession(request: CreateSessionRequest): Promise<Session> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      therapist_id: user.id,
      client_id: request.client_id,
      date: request.date,
      start_time: request.start_time,
      end_time: request.end_time,
      notes: request.notes
    })
    .select(`
      *,
      clients:client_id (
        id,
        name
      )
    `)
    .single()
  
  if (error) {
    throw new Error(`Failed to create session: ${error.message}`)
  }
  
  return data
}

export async function updateSession(id: string, request: UpdateSessionRequest): Promise<Session> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('sessions')
    .update({
      client_id: request.client_id,
      date: request.date,
      start_time: request.start_time,
      end_time: request.end_time,
      status: request.status,
      notes: request.notes,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('therapist_id', user.id)
    .select(`
      *,
      clients:client_id (
        id,
        name
      )
    `)
    .single()
  
  if (error) {
    throw new Error(`Failed to update session: ${error.message}`)
  }
  
  return data
}

export async function deleteSession(id: string): Promise<void> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', id)
    .eq('therapist_id', user.id)
  
  if (error) {
    throw new Error(`Failed to delete session: ${error.message}`)
  }
}

// PROGRESS NOTE FUNCTIONS
export async function getNoteBySession(sessionId: string): Promise<ProgressNote | null> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('progress_notes')
    .select('*')
    .eq('session_id', sessionId)
    .eq('therapist_id', user.id)
    .single()
  
  if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to get note: ${error.message}`)
  }
  
  return data
}

export async function createNote(request: CreateNoteRequest): Promise<ProgressNote> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('progress_notes')
    .insert({
      therapist_id: user.id,
      session_id: request.session_id,
      content: request.content
    })
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to create note: ${error.message}`)
  }
  
  return data
}

export async function updateNote(id: string, request: UpdateNoteRequest): Promise<ProgressNote> {
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { data, error } = await supabase
    .from('progress_notes')
    .update({
      content: request.content,
      status: request.status,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('therapist_id', user.id)
    .select()
    .single()
  
  if (error) {
    throw new Error(`Failed to update note: ${error.message}`)
  }
  
  return data
}
