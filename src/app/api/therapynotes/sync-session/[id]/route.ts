import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { getSession } from '@/lib/db'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const session = await getSession(id)
    if (!session.clients?.name) {
      return NextResponse.json({ error: 'Client not found' }, { status: 400 })
    }

    const { data: therapist } = await supabase
      .from('therapists')
      .select('therapynotes_username, therapynotes_password, therapynotes_practice_code')
      .eq('id', user.id)
      .single()

    if (!therapist?.therapynotes_username || !therapist?.therapynotes_password || !therapist?.therapynotes_practice_code) {
      return NextResponse.json({ error: 'TherapyNotes credentials not configured' }, { status: 400 })
    }

    const { data, error } = await supabase.functions.invoke('therapynotes-sync-session', {
      body: {
        username: therapist.therapynotes_username,
        password: therapist.therapynotes_password,
        practiceCode: therapist.therapynotes_practice_code,
        clientName: session.clients.name,
        date: session.date,
        startTime: session.start_time,
        endTime: session.end_time
      }
    })

    if (error || !data?.success) {
      return NextResponse.json({ error: data?.error || error?.message || 'Sync failed' }, { status: 500 })
    }

    // Update session with encrypted calendar entry ID
    await supabase
      .from('sessions')
      .update({ 
        synced_to_therapynotes: true,
        therapynotes_calendar_entry_id: data.appointmentId || data.ID,
        therapynotes_encrypted_calendar_entry_id: data.encryptedId || data.EncryptedID
      })
      .eq('id', id)

    // Also store patient encrypted ID on client record if provided
    if (data.patientEncryptedId) {
      await supabase
        .from('clients')
        .update({ therapynotes_encrypted_patient_id: data.patientEncryptedId })
        .eq('id', session.client_id)
    }

    return NextResponse.json({ 
      success: true, 
      appointmentId: data.appointmentId || data.ID,
      encryptedId: data.encryptedId || data.EncryptedID
    })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 })
  }
}

