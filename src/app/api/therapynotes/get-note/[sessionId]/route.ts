import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

type SessionWithClient = {
  id: string
  therapynotes_encrypted_calendar_entry_id?: string
  clients?: { therapynotes_encrypted_patient_id?: string } | { therapynotes_encrypted_patient_id?: string }[]
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ sessionId: string }> }) {
  try {
    const { sessionId } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: session } = await supabase
      .from('sessions')
      .select(`
        id,
        therapynotes_encrypted_calendar_entry_id,
        clients:client_id (
          therapynotes_encrypted_patient_id
        )
      `)
      .eq('id', sessionId)
      .eq('therapist_id', user.id)
      .single()

    if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

    const s = session as SessionWithClient
    const encryptedPatientId = Array.isArray(s.clients)
      ? s.clients[0]?.therapynotes_encrypted_patient_id
      : s.clients?.therapynotes_encrypted_patient_id
    if (!session.therapynotes_encrypted_calendar_entry_id || !encryptedPatientId) {
      return NextResponse.json({ error: 'Session or client not synced to TherapyNotes' }, { status: 400 })
    }

    const { data: therapist } = await supabase
      .from('therapists')
      .select('therapynotes_username, therapynotes_password, therapynotes_practice_code')
      .eq('id', user.id)
      .single()

    if (!therapist?.therapynotes_username || !therapist?.therapynotes_password || !therapist?.therapynotes_practice_code) {
      return NextResponse.json({ error: 'TherapyNotes credentials not configured' }, { status: 400 })
    }

    const { data, error } = await supabase.functions.invoke('therapynotes-get-note', {
      body: {
        encryptedCalendarEntryId: session.therapynotes_encrypted_calendar_entry_id,
        encryptedPatientId,
        username: therapist.therapynotes_username,
        password: therapist.therapynotes_password,
        practiceCode: therapist.therapynotes_practice_code
      }
    })

    if (error || !data?.success) return NextResponse.json({ error: data?.error || error?.message || 'Failed to fetch' }, { status: 500 })

    return NextResponse.json({ data })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed' }, { status: 500 })
  }
}


