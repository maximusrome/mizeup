import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ clientId: string }> }
) {
  const { clientId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const excludeSessionId = req.nextUrl.searchParams.get('exclude')

  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date')
    .eq('client_id', clientId)
    .eq('therapist_id', user.id)
    .order('date', { ascending: false })

  if (!sessions?.length) return NextResponse.json({ data: [] })

  const sessionIds = sessions.filter(s => s.id !== excludeSessionId).map(s => s.id)
  if (!sessionIds.length) return NextResponse.json({ data: [] })

  const { data: notes } = await supabase
    .from('progress_notes')
    .select('session_id, content')
    .eq('therapist_id', user.id)
    .in('session_id', sessionIds)

  const dateMap = new Map(sessions.map(s => [s.id, s.date]))

  const planHistory = (notes || [])
    .filter(note => note.content?.plan)
    .map(note => ({
      sessionId: note.session_id,
      date: dateMap.get(note.session_id) || '',
      plan: note.content.plan
    }))
    .filter(item => item.date)
    .sort((a, b) => b.date.localeCompare(a.date))

  return NextResponse.json({ data: planHistory })
}

