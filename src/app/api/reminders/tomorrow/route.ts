import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getTomorrowSessions } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    // Authenticate via API key
    const apiKey = request.nextUrl.searchParams.get('key')
    if (!apiKey) {
      return NextResponse.json({ error: 'API key required' }, { status: 401 })
    }
    
    // Use admin client to bypass RLS since this is an API key-authenticated endpoint
    const supabase = createAdminClient()
    const { data: therapist } = await supabase
      .from('therapists')
      .select('id, reminder_message_template')
      .eq('reminder_api_key', apiKey)
      .single()
    
    if (!therapist) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 })
    }
    
    // Calculate tomorrow's date in server's local timezone
    // This matches how dates are stored in the database
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    
    // Format as YYYY-MM-DD in local timezone
    const year = tomorrow.getFullYear()
    const month = String(tomorrow.getMonth() + 1).padStart(2, '0')
    const day = String(tomorrow.getDate()).padStart(2, '0')
    const tomorrowDate = `${year}-${month}-${day}`
    
    // Get sessions using admin client to bypass RLS
    const sessions = await getTomorrowSessions(therapist.id, tomorrowDate, supabase)
    
    // Format messages
    const template = therapist.reminder_message_template || 'Hey {clientName}, looking forward to our session tomorrow at {sessionTime}'
    const reminders = sessions.map(s => {
      // Extract first name only (first word before space)
      const firstName = s.clientName.split(' ')[0]
      return {
        phoneNumber: s.phoneNumber,
        message: template
          .replace('{clientName}', firstName)
          .replace('{sessionTime}', s.sessionTime)
      }
    })
    
    // Return array directly to simplify Shortcuts setup (one less step)
    // Shortcuts can work with arrays directly, no need to wrap in object
    return NextResponse.json(reminders)
  } catch (error) {
    console.error('Reminder API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reminders' },
      { status: 500 }
    )
  }
}

