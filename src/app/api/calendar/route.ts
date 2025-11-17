import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const ical = require('ical')

async function parseIcalFeed(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch calendar')
  
  const parsed = ical.parseICS(await response.text())
  const now = new Date()
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  
  const events = []
  for (const item of Object.values(parsed)) {
    const event = item as { type?: string; start?: Date; end?: Date; uid?: string; summary?: string }
    if (event.type !== 'VEVENT' || !event.start || !event.end) continue
    
    const start = new Date(event.start)
    // Only include past sessions (within last 2 weeks, but not future)
    if (start < twoWeeksAgo || start > now) continue
    
    const formatDateForStorage = (date: Date) => {
      return date.toISOString()
    }
    
    events.push({
      uid: event.uid,
      title: event.summary || 'Untitled',
      start: formatDateForStorage(event.start),
      end: formatDateForStorage(event.end)
    })
  }
  
  return events.sort((a, b) => 
    new Date(a.start).getTime() - new Date(b.start).getTime()
  )
}

function findMatchingClient(eventTitle: string, clients: Array<{ id: string; name: string; calendar_nickname?: string | null }>) {
  // Auto-match if:
  // 1. Exact match with saved calendar_nickname (previously matched)
  // 2. Exact match with client's full name in MizeUp
  // Only exact matches - safe and predictable
  const normalized = eventTitle.trim().toLowerCase()
  
  return clients.find(c => 
    c.calendar_nickname?.toLowerCase() === normalized ||
    c.name.toLowerCase() === normalized
  ) || null
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const settingsOnly = searchParams.get('settings') === 'true'

    const { data: therapist } = await supabase
      .from('therapists')
      .select('ical_feed_url')
      .eq('id', user.id)
      .single()

    // If only settings requested, return just the URL
    if (settingsOnly) {
      return NextResponse.json({ ical_feed_url: therapist?.ical_feed_url || '' })
    }

    if (!therapist?.ical_feed_url) {
      return NextResponse.json({ events: [], needsSetup: true })
    }

    const events = await parseIcalFeed(therapist.ical_feed_url)

    const { data: clients } = await supabase
      .from('clients')
      .select('id, name, calendar_nickname')
      .eq('therapist_id', user.id)

    const { data: existingSessions } = await supabase
      .from('sessions')
      .select('client_id, date, start_time')
      .eq('therapist_id', user.id)

    const existingSet = new Set(
      existingSessions?.map(s => `${s.client_id}|${s.date}|${s.start_time}`) || []
    )
    const existingTimesSet = new Set(
      existingSessions?.map(s => `${s.date}|${s.start_time}`) || []
    )

    const eventsWithMatches = events
      .map(event => {
        const match = findMatchingClient(event.title, clients || [])
        const eventDate = new Date(event.start)
        const date = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, '0')}-${String(eventDate.getDate()).padStart(2, '0')}`
        const time = `${String(eventDate.getHours()).padStart(2, '0')}:${String(eventDate.getMinutes()).padStart(2, '0')}:00`
        
        if (match && existingSet.has(`${match.id}|${date}|${time}`)) return null
        if (existingTimesSet.has(`${date}|${time}`)) return null
        
        // Auto-select if there's an exact nickname match (previously matched)
        // Otherwise require manual matching
        return {
          ...event,
          selected: !!match, // Auto-select if there's a match
          matchedClientId: match?.id,
          matchedClientName: match?.name
        }
      })
      .filter(Boolean)

    return NextResponse.json({ 
      events: eventsWithMatches, 
      clients: clients || [],
      needsSetup: false 
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (body.icalUrl) {
      // Automatically convert webcal:// to https://
      const normalizedUrl = body.icalUrl.replace(/^webcal:\/\//i, 'https://')
      
      await parseIcalFeed(normalizedUrl)

      const { error } = await supabase
        .from('therapists')
        .update({ ical_feed_url: normalizedUrl })
        .eq('id', user.id)

      if (error) throw error

      return NextResponse.json({ success: true })
    }

    if (body.sessions) {
      const created = []
      const nicknameUpdates = new Map<string, string>()

      for (const session of body.sessions) {
        const { data: existing } = await supabase
          .from('sessions')
          .select('id')
          .eq('therapist_id', user.id)
          .eq('client_id', session.client_id)
          .eq('date', session.date)
          .eq('start_time', session.start_time)
          .maybeSingle()

        if (existing) continue

        const { data: newSession } = await supabase
          .from('sessions')
          .insert({
            therapist_id: user.id,
            client_id: session.client_id,
            date: session.date,
            start_time: session.start_time,
            end_time: session.end_time
          })
          .select('*, clients:client_id(id, name)')
          .single()

        if (newSession) {
          created.push(newSession)
          if (session.calendar_title) {
            nicknameUpdates.set(session.client_id, session.calendar_title)
          }
        }
      }

      for (const [clientId, calendarTitle] of nicknameUpdates.entries()) {
        await supabase
          .from('clients')
          .update({ calendar_nickname: calendarTitle })
          .eq('id', clientId)
          .eq('therapist_id', user.id)
      }

      return NextResponse.json({ data: created })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Operation failed' },
      { status: 500 }
    )
  }
}

