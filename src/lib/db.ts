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
      ),
      progress_notes (
        id,
        status
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
  
  // Transform the data to include has_progress_note flag
  const sessions = (data || []).map((session: Session & { progress_notes?: { id: string; status: string }[] }) => {
    const hasCompletedNote = session.progress_notes && 
                             session.progress_notes.length > 0 && 
                             session.progress_notes[0].status === 'completed'
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { progress_notes, ...sessionData } = session
    return {
      ...sessionData,
      has_progress_note: hasCompletedNote
    }
  })
  
  return sessions
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
  
  const updateData: {
    client_id: string
    date: string
    start_time: string
    end_time: string
    status?: string
    notes?: string
    updated_at: string
    recurring_frequency?: string | null
    recurring_end_date?: string | null
    recurring_group_id?: string | null
  } = {
    client_id: request.client_id,
    date: request.date,
    start_time: request.start_time,
    end_time: request.end_time,
    status: request.status,
    notes: request.notes,
    updated_at: new Date().toISOString()
  }

  // Handle recurring fields - explicitly set to null if undefined
  if (request.recurring_frequency !== undefined) {
    updateData.recurring_frequency = request.recurring_frequency || null
  }
  if (request.recurring_end_date !== undefined) {
    updateData.recurring_end_date = request.recurring_end_date || null
  }
  if (request.recurring_group_id !== undefined) {
    updateData.recurring_group_id = request.recurring_group_id || null
  }

  const { data, error } = await supabase
    .from('sessions')
    .update(updateData)
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

// RECURRING SESSION FUNCTIONS

// Create recurring sessions
export async function createRecurringSessions(request: CreateSessionRequest): Promise<Session[]> {
  // Validate required fields for recurring sessions
  if (!request.recurring_frequency || !request.recurring_end_date) {
    throw new Error('Recurring frequency and end date are required for recurring sessions')
  }
  
  const recurringGroupId = crypto.randomUUID()
  const sessions: Session[] = []
  
  // Generate all session dates first
  const sessionDates = [new Date(request.date)]
  let currentDate = new Date(request.date)
  const endDate = new Date(request.recurring_end_date)
  
  let iterations = 0
  const maxIterations = 100 // Prevent infinite loops
  
  while (currentDate <= endDate && iterations < maxIterations) {
    currentDate = getNextDate(currentDate, request.recurring_frequency)
    if (currentDate <= endDate) {
      sessionDates.push(new Date(currentDate))
    }
    iterations++
  }
  
  if (iterations >= maxIterations) {
    throw new Error('Too many recurring sessions. Maximum is 100 occurrences.')
  }
  
  // Create all sessions in a transaction-like manner
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  for (const sessionDate of sessionDates) {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          therapist_id: user.id,
          client_id: request.client_id,
          date: sessionDate.toISOString().split('T')[0],
          start_time: request.start_time,
          end_time: request.end_time,
          notes: request.notes,
          recurring_group_id: recurringGroupId,
          recurring_frequency: request.recurring_frequency,
          recurring_end_date: request.recurring_end_date
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
        // If it's a duplicate key error, skip this session and continue
        if (error.code === '23505') {
          console.warn(`Skipping duplicate session for ${sessionDate.toISOString().split('T')[0]} at ${request.start_time}`)
          continue
        }
        throw new Error(`Failed to create session: ${error.message}`)
      }
      
      sessions.push(data)
    } catch (error) {
      // If it's a duplicate key error, skip this session and continue
      if (error instanceof Error && error.message.includes('duplicate key')) {
        console.warn(`Skipping duplicate session for ${sessionDate.toISOString().split('T')[0]} at ${request.start_time}`)
        continue
      }
      throw error
    }
  }
  
  return sessions
}

// Update session with scope
export async function updateSessionWithScope(id: string, request: UpdateSessionRequest): Promise<Session[]> {
  const session = await getSession(id)
  
  if (request.update_scope === 'all_future' && session.recurring_group_id) {
    // Check if recurring pattern changed (frequency, end date, OR the actual date/day of week)
    const dateChanged = request.date !== session.date
    const recurringChanged = request.recurring_frequency !== session.recurring_frequency || 
                           request.recurring_end_date !== session.recurring_end_date ||
                           dateChanged
    
    if (recurringChanged) {
      // If recurring pattern or date changed, we need to regenerate all future sessions
      return await regenerateRecurringSessions(id, request)
    } else {
      // Just update existing sessions with new time/content (no date change)
      const user = await getCurrentUser()
      const supabase = await createSupabaseClient()
      
      const { data, error } = await supabase
        .from('sessions')
        .update({
          client_id: request.client_id,
          start_time: request.start_time,
          end_time: request.end_time,
          status: request.status,
          notes: request.notes,
          updated_at: new Date().toISOString()
        })
        .eq('therapist_id', user.id)
        .eq('recurring_group_id', session.recurring_group_id)
        .gte('date', session.date)
        .select(`
          *,
          clients:client_id (
            id,
            name
          )
        `)
      
      if (error) throw new Error(`Failed to update sessions: ${error.message}`)
      return data || []
    }
  } else {
    // Update single session
    return [await updateSession(id, request)]
  }
}

// Regenerate recurring sessions when pattern changes
async function regenerateRecurringSessions(id: string, request: UpdateSessionRequest): Promise<Session[]> {
  const session = await getSession(id)
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  // Delete all future sessions in the recurring group
  await supabase
    .from('sessions')
    .delete()
    .eq('therapist_id', user.id)
    .eq('recurring_group_id', session.recurring_group_id)
    .gte('date', session.date)
  
  // Generate new sessions from the updated session date forward
  const newSessions = await createRecurringSessions({
    client_id: request.client_id,
    date: request.date,
    start_time: request.start_time,
    end_time: request.end_time,
    notes: request.notes,
    is_recurring: true,
    recurring_frequency: request.recurring_frequency || session.recurring_frequency,
    recurring_end_date: request.recurring_end_date || session.recurring_end_date
  })
  
  return newSessions
}

// Delete only future sessions in a recurring group (for conversion purposes)
export async function deleteFutureSessions(id: string): Promise<void> {
  const session = await getSession(id)
  if (!session.recurring_group_id) return
  
  const user = await getCurrentUser()
  const supabase = await createSupabaseClient()
  
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('therapist_id', user.id)
    .eq('recurring_group_id', session.recurring_group_id)
    .gt('date', session.date) // Only delete future sessions, not current
  
  if (error) throw new Error(`Failed to delete future sessions: ${error.message}`)
}

// Delete session with scope
export async function deleteSessionWithScope(id: string, scope: 'single' | 'all_future'): Promise<void> {
  const session = await getSession(id)
  
  if (scope === 'all_future' && session.recurring_group_id) {
    // Delete all sessions in the group
    const user = await getCurrentUser()
    const supabase = await createSupabaseClient()
    
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('therapist_id', user.id)
      .eq('recurring_group_id', session.recurring_group_id)
      .gte('date', session.date)
    
    if (error) throw new Error(`Failed to delete sessions: ${error.message}`)
  } else {
    // Delete single session
    await deleteSession(id)
  }
}

// Helper function to get next recurring date
function getNextDate(currentDate: Date, frequency: string): Date {
  const next = new Date(currentDate)
  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7)
      break
    case 'biweekly':
      next.setDate(next.getDate() + 14)
      break
    case 'every4weeks':
      next.setDate(next.getDate() + 28)
      break
  }
  return next
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
