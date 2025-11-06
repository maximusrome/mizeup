import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTomorrowSessions } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Authenticate via API key
    const apiKey = request.nextUrl.searchParams.get('key')
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }
    
    const supabase = await createClient()
    const { data: therapist } = await supabase
      .from('therapists')
      .select('id, reminder_message_template')
      .eq('reminder_api_key', apiKey)
      .eq('reminder_enabled', true)
      .single()
    
    if (!therapist) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }
    
    // Calculate tomorrow's date in local timezone (not UTC)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    // Format as YYYY-MM-DD in local timezone
    const year = tomorrow.getFullYear()
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const day = String(tomorrow.getDate()).padStart(2, '0')
    const tomorrowDate = `${year}-${month}-${day}`
    
    // Get sessions
    const sessions = await getTomorrowSessions(therapist.id, tomorrowDate)
    
    // Debug: Check what we got
    console.log('Tomorrow date:', tomorrowDate)
    console.log('Sessions found:', sessions.length)
    console.log('Sessions:', JSON.stringify(sessions, null, 2))
    
    // Format messages
    const template = therapist.reminder_message_template || 'Hey {clientName}, looking forward to our session tomorrow at {sessionTime}.'
    const reminders = sessions.map(s => ({
      clientName: s.clientName,
      phoneNumber: s.phoneNumber,
      sessionTime: s.sessionTime,
      message: template
        .replace('{clientName}', s.clientName)
        .replace('{sessionTime}', s.sessionTime)
    }))
    
    return NextResponse.json({ 
      reminders,
      debug: {
        tomorrowDate,
        sessionsCount: sessions.length,
        sessions: sessions
      }
    })
  } catch (error) {
    console.error('Reminder API error:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

