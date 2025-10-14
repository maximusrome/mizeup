import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSession } from '@/lib/db'

export async function POST(_: Request, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(sessionId)
    if (!session.synced_to_therapynotes || !session.therapynotes_appointment_id || !session.clients?.name) {
      return NextResponse.json({ error: 'Session not ready for sync' }, { status: 400 })
    }

    const { data: progressNote } = await supabase.from('progress_notes').select('*').eq('session_id', sessionId).eq('therapist_id', user.id).single()
    if (!progressNote) return NextResponse.json({ error: 'Progress note not found' }, { status: 400 })

    const { data: therapist } = await supabase.from('therapists').select('therapynotes_username, therapynotes_password, therapynotes_practice_code').eq('id', user.id).single()
    if (!therapist?.therapynotes_username || !therapist?.therapynotes_password || !therapist?.therapynotes_practice_code) {
      return NextResponse.json({ error: 'TherapyNotes credentials not configured' }, { status: 400 })
    }

    const { data, error } = await supabase.functions.invoke('therapynotes-sync-progress-note', {
      body: {
        username: therapist.therapynotes_username, password: therapist.therapynotes_password, practiceCode: therapist.therapynotes_practice_code,
        patientId: null, calendarEntryId: parseInt(session.therapynotes_appointment_id), sessionDate: session.date, sessionStartTime: session.start_time,
        sessionDuration: (new Date(`2000-01-01 ${session.end_time}`).getTime() - new Date(`2000-01-01 ${session.start_time}`).getTime()) / 60000,
        progressNoteContent: progressNote.content, clientName: session.clients.name
      }
    })

    if (error || !data?.success) return NextResponse.json({ error: data?.error || error?.message || 'Sync failed' }, { status: 500 })

    await supabase.from('progress_notes').update({ synced_to_therapynotes: true }).eq('id', progressNote.id)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Sync progress note error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unexpected error' }, { status: 500 })
  }
}