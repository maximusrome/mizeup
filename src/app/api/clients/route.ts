import { NextRequest, NextResponse } from 'next/server'
import { getClients, createClient } from '@/lib/db'
import type { CreateClientRequest } from '@/types'

// GET /api/clients - Get all clients
export async function GET() {
  try {
    const clients = await getClients()
    return NextResponse.json({ data: clients })
  } catch (error) {
    console.error('Error getting clients:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get clients' },
      { status: 500 }
    )
  }
}

// POST /api/clients - Create new client
export async function POST(request: NextRequest) {
  try {
    const body: CreateClientRequest = await request.json()
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }
    
    const client = await createClient({
      name: body.name.trim()
    })
    
    return NextResponse.json({ data: client }, { status: 201 })
  } catch (error) {
    console.error('Error creating client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create client' },
      { status: 500 }
    )
  }
}
