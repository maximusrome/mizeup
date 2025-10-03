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

export async function updateSession(id: string, request: UpdateSessionRequest): Promise<Session> {
  const response = await fetch(`/api/sessions/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })
  
  const result: ApiResponse<Session> = await response.json()
  
  if (!response.ok) {
    throw new Error(result.error || 'Failed to update session')
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

