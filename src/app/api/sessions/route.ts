import { NextRequest, NextResponse } from 'next/server'
import { getSessions, createSession, createRecurringSessions } from '@/lib/db'
import type { CreateSessionRequest } from '@/types'

// GET /api/sessions - Get all sessions (optionally filtered by date)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const date = searchParams.get('date') || undefined
    
    const sessions = await getSessions(date)
    return NextResponse.json({ data: sessions })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get sessions' },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create new session (or multiple if recurring)
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
    
    if (body.is_recurring) {
      // Return array of sessions for recurring
      const sessions = await createRecurringSessions({
        client_id: body.client_id,
        date: body.date,
        start_time: body.start_time,
        end_time: body.end_time,
        is_recurring: body.is_recurring,
        recurring_frequency: body.recurring_frequency,
        recurring_end_date: body.recurring_end_date
      })
      return NextResponse.json({ data: sessions }, { status: 201 })
    } else {
      // Return single session for non-recurring
      const session = await createSession({
        client_id: body.client_id,
        date: body.date,
        start_time: body.start_time,
        end_time: body.end_time
      })
      return NextResponse.json({ data: session }, { status: 201 })
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create session' },
      { status: 500 }
    )
  }
}
