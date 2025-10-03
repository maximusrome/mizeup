import { NextRequest, NextResponse } from 'next/server'
import { getSession, updateSession, deleteSession } from '@/lib/db'
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
    
    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/
    if (!dateRegex.test(body.date)) {
      return NextResponse.json(
        { error: 'Date must be in YYYY-MM-DD format' },
        { status: 400 }
      )
    }
    
    // Validate and normalize time format
    const normalizeTime = (time: string) => {
      if (!time) return ''
      
      // If time is already in HH:MM format, return as is
      if (/^\d{2}:\d{2}$/.test(time)) {
        return time
      }
      
      // If time is in HH:MM:SS format, extract HH:MM
      if (/^\d{2}:\d{2}:\d{2}$/.test(time)) {
        return time.substring(0, 5) // Extract first 5 characters (HH:MM)
      }
      
      // If time is in H:MM format, pad with zero
      if (/^\d{1}:\d{2}$/.test(time)) {
        return `0${time}`
      }
      
      return time
    }

    const startTime = normalizeTime(body.start_time)
    const endTime = normalizeTime(body.end_time)

    // Validate time format after normalization
    const timeRegex = /^\d{2}:\d{2}$/
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      return NextResponse.json(
        { error: 'Time must be in HH:MM format' },
        { status: 400 }
      )
    }
    
    // Validate start time is before end time
    if (startTime >= endTime) {
      return NextResponse.json(
        { error: 'Start time must be before end time' },
        { status: 400 }
      )
    }
    
    const session = await updateSession(id, {
      client_id: body.client_id,
      date: body.date,
      start_time: startTime,
      end_time: endTime,
      status: body.status,
      notes: body.notes
    })
    
    return NextResponse.json({ data: session })
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
    await deleteSession(id)
    return NextResponse.json({ message: 'Session deleted successfully' })
  } catch (error) {
    console.error('Error deleting session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete session' },
      { status: 500 }
    )
  }
}
