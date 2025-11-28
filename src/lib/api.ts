import type { 
  Client, 
  Session, 
  CreateClientRequest,
  UpdateClientRequest,
  CreateSessionRequest,
  UpdateSessionRequest,
  ApiResponse,
  CalendarEventWithMapping
} from '@/types'

// CLIENT API FUNCTIONS
export async function getClients(): Promise<Client[]> {
  const response = await fetch('/api/clients')
  const result: ApiResponse<Client[]> = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to get clients')
  }
  
  return result.data || []
}

export async function createClient(request: CreateClientRequest): Promise<Client> {
  const response = await fetch('/api/clients', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  
  const result: ApiResponse<Client> = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to create client')
  }
  
  return result.data!
}

export async function updateClient(id: string, request: UpdateClientRequest): Promise<Client> {
  const response = await fetch(`/api/clients/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  
  const result: ApiResponse<Client> = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to update client')
  }
  
  return result.data!
}

export async function deleteClient(id: string): Promise<void> {
  const response = await fetch(`/api/clients/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const result: ApiResponse<never> = await response.json()
    throw new Error(result.error || 'Failed to delete client')
  }
}

// SESSION API FUNCTIONS
export async function getSessions(date?: string): Promise<Session[]> {
  const url = date ? `/api/sessions?date=${date}` : '/api/sessions'
  const response = await fetch(url)
  const result: ApiResponse<Session[]> = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to get sessions')
  }
  
  return result.data || []
}


export async function createSession(request: CreateSessionRequest): Promise<Session> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  
  const result: ApiResponse<Session> = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to create session')
  }
  
  return result.data!
}

export async function deleteSession(id: string): Promise<void> {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'DELETE',
  })
  
  if (!response.ok) {
    const result: ApiResponse<never> = await response.json()
    throw new Error(result.error || 'Failed to delete session')
  }
}

// RECURRING SESSION API FUNCTIONS

export async function createRecurringSessions(request: CreateSessionRequest): Promise<Session[]> {
  const response = await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  
  const result: ApiResponse<Session[]> = await response.json()
  if (!response.ok) {
    // Provide more helpful error messages
    if (result.error?.includes('duplicate key')) {
      throw new Error('Some sessions already exist at those times. Please choose different times or dates.')
    }
    throw new Error(result.error || 'Failed to create sessions')
  }
  return result.data || []
}

export async function updateSessionWithScope(id: string, request: UpdateSessionRequest): Promise<Session[]> {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  })
  
  const result: ApiResponse<Session[]> = await response.json()
  if (!response.ok) throw new Error(result.error || 'Failed to update session')
  return result.data || []
}

export async function deleteSessionWithScope(id: string, scope: 'single' | 'all_future'): Promise<void> {
  const response = await fetch(`/api/sessions/${id}?scope=${scope}`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    const result: ApiResponse<never> = await response.json()
    throw new Error(result.error || 'Failed to delete session')
  }
}

export async function deleteFutureSessions(id: string): Promise<void> {
  const response = await fetch(`/api/sessions/${id}?deleteFuture=true`, {
    method: 'DELETE'
  })
  
  if (!response.ok) {
    const result: ApiResponse<never> = await response.json()
    throw new Error(result.error || 'Failed to delete future sessions')
  }
}

// CALENDAR IMPORT API FUNCTIONS
export async function connectCalendar(icalUrl: string): Promise<void> {
  const response = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ icalUrl })
  })
  
  if (!response.ok) {
    const result: ApiResponse<never> = await response.json()
    throw new Error(result.error || 'Failed to connect calendar')
  }
}

export async function fetchCalendarEvents(): Promise<{
  events: CalendarEventWithMapping[]
  clients: Client[]
  needsSetup: boolean
}> {
  const tz = new Date().getTimezoneOffset()
  const response = await fetch(`/api/calendar?tz=${tz}`)
  const result = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to fetch calendar events')
  }
  
  return result
}

export async function importCalendarSessions(sessions: Array<{
  client_id: string
  date: string
  start_time: string
  end_time: string
  calendar_title: string
}>): Promise<Session[]> {
  const response = await fetch('/api/calendar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessions })
  })
  
  const result: ApiResponse<Session[]> = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to import sessions')
  }
  
  return result.data || []
}

