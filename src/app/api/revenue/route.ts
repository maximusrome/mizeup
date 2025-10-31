import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ProgressNote } from '@/types'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all progress notes for this therapist with session date
  const { data: notes, error } = await supabase
    .from('progress_notes')
    .select(`
      *,
      sessions:session_id (
        id,
        date
      )
    `)
    .eq('therapist_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ data: notes || [] })
}

