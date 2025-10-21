import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSession } from '@/lib/db'

export async function POST(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Get therapist credentials
    const { data: therapist } = await supabase
      .from('therapists')
      .select('therapynotes_username, therapynotes_password, therapynotes_practice_code')
      .eq('id', user.id)
      .single()

    if (!therapist?.therapynotes_username || !therapist?.therapynotes_password || !therapist?.therapynotes_practice_code) {
      return NextResponse.json({ error: 'TherapyNotes credentials not configured' }, { status: 400 })
    }

    // Get session data
    const session = await getSession(sessionId)
    if (!session.therapynotes_encrypted_calendar_entry_id || !session.therapynotes_calendar_entry_id) {
      return NextResponse.json({ error: 'Session not synced to TherapyNotes' }, { status: 400 })
    }

    // Get client data
    const { data: client } = await supabase
      .from('clients')
      .select('therapynotes_encrypted_patient_id')
      .eq('id', session.client_id)
      .single()

    if (!client?.therapynotes_encrypted_patient_id) {
      return NextResponse.json({ error: 'Client not synced to TherapyNotes' }, { status: 400 })
    }

    // Format date/time
    const sessionDate = new Date(session.date).toISOString().split('T')[0]
    const sessionStartTime = session.start_time || "03:00:00"

    // Call consolidated edge function (login once, do all 3 steps)
    const { data: syncData, error: syncError } = await supabase.functions.invoke('therapynotes-sync-progress-note', {
      body: {
        username: therapist.therapynotes_username,
        password: therapist.therapynotes_password,
        practiceCode: therapist.therapynotes_practice_code,
        calendarEntryId: parseInt(session.therapynotes_calendar_entry_id),
        encryptedCalendarEntryId: session.therapynotes_encrypted_calendar_entry_id,
        encryptedPatientId: client.therapynotes_encrypted_patient_id,
        sessionDate,
        sessionStartTime
      }
    })

    if (syncError || !syncData?.success) {
      return NextResponse.json({ 
        error: `Save note failed: ${syncData?.error || syncError?.message}`
      }, { status: 500 })
    }

    // Mark note as synced
    await supabase.from('progress_notes').update({ synced_to_therapynotes: true }).eq('session_id', sessionId)
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Sync progress note error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 })
  }
}