import { NextRequest, NextResponse } from 'next/server'
import { getSessions, createSession } from '@/lib/db'
import type { CreateSessionRequest } from '@/types'

// GET /api/sessions - Get all sessions (optionally filtered by date)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || undefined
    
    const sessions = await getSessions(date)
    return NextResponse.json({ data: sessions })
  } catch (error) {
    console.error('Error getting sessions:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sessions' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    const body: CreateSessionRequest = await request.json()
    
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
    
    const session = await createSession({
      client_id: body.client_id,
      date: body.date,
      start_time: startTime,
      end_time: endTime,
      notes: body.notes
    })
    
    return NextResponse.json({ data: session }, { status: 201 })
  } catch (error) {
    console.error('Error creating session:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    )
  }
}
