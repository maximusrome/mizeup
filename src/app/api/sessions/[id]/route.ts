import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateSessionWithScope, deleteSessionWithScope, deleteFutureSessions } from '@/lib/db'
import type { UpdateSessionRequest } from '@/types'

// GET /api/sessions/[id] - Get specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await getSession(id)
    return NextResponse.json({ data: session })
  } catch (error) {
    console.error('Error getting session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get session' },
      { status: 500 }
    )
  }
}

// PUT /api/sessions/[id] - Update session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const body: UpdateSessionRequest = await request.json()
    
    // Validate required fields
    if (!body.client_id || !body.date || !body.start_time || !body.end_time) {
      return NextResponse.json(
        { error: 'Client ID, date, start time, and end time are required' },
        { status: 400 }
      )
    }
    
    const sessions = await updateSessionWithScope(id, {
      client_id: body.client_id,
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      status: body.status,
      notes: body.notes,
      update_scope: body.update_scope,
      recurring_frequency: body.recurring_frequency,
      recurring_end_date: body.recurring_end_date,
      recurring_group_id: body.recurring_group_id
    })
    
    return NextResponse.json({ data: sessions })
  } catch (error) {
    console.error('Error updating session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update session' },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[id] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const { searchParams } = new URL(request.url)
    const scope = searchParams.get('scope') as 'single' | 'all_future' || 'single'
    const deleteFuture = searchParams.get('deleteFuture')
    
    if (deleteFuture === 'true') {
      await deleteFutureSessions(id)
    } else {
      await deleteSessionWithScope(id, scope)
    }
    
    return NextResponse.json({ message: 'Session deleted successfully' })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete session' },
      { status: 500 }
    )
  }
}

