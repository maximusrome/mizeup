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

    await supabase
      .from('sessions')
      .update({ 
        synced_to_therapynotes: true,
        therapynotes_appointment_id: data.appointmentId || data.ID
      })
      .eq('id', id)

    return NextResponse.json({ success: true, appointmentId: data.appointmentId || data.ID })

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 })
  }
}

