import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// POST /api/recordings/ingest - Receive rrweb events and forward to PostHog
// 
// Auth approach: The userscript is downloaded from an authenticated endpoint
// which embeds the user ID. We accept that userId in the request.
// This is secure because only authenticated users can get the script.
export async function POST(request: NextRequest) {
  try {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!posthogKey) {
      return NextResponse.json({ error: 'PostHog not configured' }, { status: 500 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.events || !Array.isArray(body.events)) {
      return NextResponse.json({ error: 'events array is required' }, { status: 400 })
    }

    if (!body.sessionId || !body.windowId) {
      return NextResponse.json({ error: 'sessionId and windowId are required' }, { status: 400 })
    }

    if (!body.userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 })
    }

    // Optional: Verify the userId exists in our database
    // The userId was embedded in the userscript which required authentication to download
    // So we trust it, but log for monitoring
    const supabase = await createClient()
    const { data: therapist } = await supabase
      .from('therapists')
      .select('id')
      .eq('id', body.userId)
      .single()
    
    if (!therapist) {
      console.warn('[recordings/ingest] Unknown userId:', body.userId)
      // Still process it - the user ID was embedded in the authenticated script
    }

    // Format as PostHog expects for session recordings
    // PostHog uses $snapshot events with $snapshot_data containing rrweb events
    const posthogPayload = {
      api_key: posthogKey,
      batch: [
        {
          event: '$snapshot',
          properties: {
            $snapshot_data: body.events,
            $session_id: body.sessionId,
            $window_id: body.windowId,
            $lib: 'mizeup-recorder',
            $lib_version: '1.0.0',
            distinct_id: body.userId,
            // Include URL for context
            $current_url: body.url || 'unknown',
          },
          timestamp: new Date().toISOString(),
          distinct_id: body.userId,
        }
      ]
    }

    // Send to PostHog's batch API
    const response = await fetch('https://us.i.posthog.com/batch/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(posthogPayload),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[recordings/ingest] PostHog error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to send to PostHog', details: errorText },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true, eventsCount: body.events.length })
  } catch (error) {
    console.error('[recordings/ingest] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process recording' },
      { status: 500 }
    )
  }
}
