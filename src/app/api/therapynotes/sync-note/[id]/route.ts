import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: therapist } = await supabase
      .from('therapists')
      .select('therapynotes_username, therapynotes_password, therapynotes_practice_code')
      .eq('id', user.id)
      .single()

    if (!therapist?.therapynotes_username || !therapist?.therapynotes_password || !therapist?.therapynotes_practice_code) {
      return NextResponse.json({ error: 'TherapyNotes credentials not configured' }, { status: 400 })
    }

    const { data, error } = await supabase.functions.invoke('therapynotes-sync-note', {
      body: {
        noteId: id,
        username: therapist.therapynotes_username,
        password: therapist.therapynotes_password,
        practiceCode: therapist.therapynotes_practice_code
      }
    })

    if (error || !data?.success) {
      return NextResponse.json({ error: data?.error || error?.message || 'Sync failed' }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Sync failed'
    }, { status: 500 })
  }
}

