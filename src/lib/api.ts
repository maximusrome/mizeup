import type { 
  Client, 
  Session, 
  CreateClientRequest,
  CreateSessionRequest,
  UpdateSessionRequest,
  ApiResponse 
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

