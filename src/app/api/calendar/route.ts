import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const IcalExpander = require('ical-expander')

const DAYS_TO_IMPORT = 14
const MS_PER_DAY = 24 * 60 * 60 * 1000

type ExpandedEvent = {
  uid: string
  title: string
  start: string
  end: string
  sourceUid: string
}

type ICalComponent = {
  getFirstPropertyValue?: (key: string) => string
}

type ICalEvent = {
  uid: string
  summary: string
  component: ICalComponent
  startDate: { toJSDate: () => Date }
  endDate: { toJSDate: () => Date }
}

type ICalOccurrence = {
  item: {
    uid: string
    summary: string
    component: ICalComponent
  }
  startDate: { toJSDate: () => Date }
  endDate: { toJSDate: () => Date }
}

async function parseIcalFeed(url: string) {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch calendar')
  
  const ics = await response.text()
  const rangeEnd = new Date()
  const rangeStart = new Date(rangeEnd.getTime() - DAYS_TO_IMPORT * MS_PER_DAY)
  
  const expander = new IcalExpander({
    ics,
    maxIterations: 1000
  })
  
  const { events, occurrences } = expander.between(rangeStart, rangeEnd)
  const dedupedEvents = new Map<string, ExpandedEvent>()

  const toIso = (date: Date) => date.toISOString()

  const addEvent = (uid: string, title: string, start: Date, end: Date) => {
    const key = `${uid}-${toIso(start)}`
    if (dedupedEvents.has(key)) return
    dedupedEvents.set(key, {
      uid: key,
      sourceUid: uid,
      title,
      start: toIso(start),
      end: toIso(end)
    })
  }

  const isCancelled = (component?: { getFirstPropertyValue?: (key: string) => string }) =>
    component?.getFirstPropertyValue?.('status') === 'CANCELLED'
  
  const isAllDay = (start: Date, end: Date) => {
    const startOfDay = new Date(start).setHours(0, 0, 0, 0)
    const endOfDay = new Date(end).setHours(0, 0, 0, 0)
    return startOfDay === endOfDay && (end.getTime() - start.getTime()) % MS_PER_DAY === 0
  }

  events.forEach((event: ICalEvent) => {
    if (isCancelled(event.component)) return
    const hasRRule = Boolean(event.component.getFirstPropertyValue?.('rrule'))
    if (hasRRule) return // Skip master events, occurrences will handle them
    const startDate = event.startDate.toJSDate()
    const endDate = event.endDate.toJSDate()
    if (isAllDay(startDate, endDate)) return
    addEvent(event.uid, event.summary || 'Untitled', startDate, endDate)
  })

  occurrences.forEach((occurrence: ICalOccurrence) => {
    if (isCancelled(occurrence.item.component)) return
    const startDate = occurrence.startDate.toJSDate()
    const endDate = occurrence.endDate.toJSDate()
    if (isAllDay(startDate, endDate)) return
    addEvent(
      occurrence.item.uid,
      occurrence.item.summary || 'Untitled',
      startDate,
      endDate
    )
  })

  return Array.from(dedupedEvents.values()).sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  )
}

function findMatchingClient(eventTitle: string, clients: Array<{ id: string; name: string; calendar_nickname?: string | null }>) {
  // Auto-match if:
  // 1. Exact match with saved calendar_nickname (previously matched)
  // 2. Exact match with client's full name in MizeUp
  // Only exact matches - safe and predictable
  const normalized = eventTitle.trim().toLowerCase()
  
  return clients.find(c => {
    const nicknameMatch = c.calendar_nickname?.trim().toLowerCase() === normalized
    const nameMatch = c.name.trim().toLowerCase() === normalized
    return nicknameMatch || nameMatch
  }) || null
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
    const tzOffset = parseInt(searchParams.get('tz') || '0', 10)

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
      .select('date, start_time')
      .eq('therapist_id', user.id)

    const existingTimes = new Set(
      existingSessions?.map(s => `${s.date}|${s.start_time}`) || []
    )

    const formatDate = (isoString: string) => {
      const d = new Date(new Date(isoString).getTime() - tzOffset * 60000)
      const year = d.getUTCFullYear()
      const month = String(d.getUTCMonth() + 1).padStart(2, '0')
      const day = String(d.getUTCDate()).padStart(2, '0')
      const hours = String(d.getUTCHours()).padStart(2, '0')
      const minutes = String(d.getUTCMinutes()).padStart(2, '0')
      return {
        date: `${year}-${month}-${day}`,
        time: `${hours}:${minutes}:00`
      }
    }

    const eventsWithMatches = events
      .map(event => {
        const match = findMatchingClient(event.title, clients || [])
        const { date, time } = formatDate(event.start)
        
        if (existingTimes.has(`${date}|${time}`)) return null
        
        return {
          ...event,
          selected: !!match,
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

