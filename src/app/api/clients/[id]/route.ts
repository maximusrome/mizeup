import { NextRequest, NextResponse } from 'next/server'
import { getClient, updateClient, deleteClient } from '@/lib/db'
import type { UpdateClientRequest } from '@/types'

// GET /api/clients/[id] - Get specific client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const client = await getClient(id)
    return NextResponse.json({ data: client })
  } catch (error) {
    console.error('Error getting client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get client' },
      { status: 500 }
    )
  }
}

// PUT /api/clients/[id] - Update client
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body: UpdateClientRequest = await request.json()
    
    // Validate required fields
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { error: 'Client name is required' },
        { status: 400 }
      )
    }
    
    const client = await updateClient(id, {
      name: body.name.trim()
    })
    
    return NextResponse.json({ data: client })
  } catch (error) {
    console.error('Error updating client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update client' },
      { status: 500 }
    )
  }
}

// DELETE /api/clients/[id] - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    await deleteClient(id)
    return NextResponse.json({ message: 'Client deleted successfully' })
  } catch (error) {
    console.error('Error deleting client:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete client' },
      { status: 500 }
    )
  }
}
