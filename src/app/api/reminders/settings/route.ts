import { NextRequest, NextResponse } from 'next/server'
import { getTherapistSettings, updateTherapistSettings } from '@/lib/db'

export async function GET() {
  try {
    const settings = await getTherapistSettings()
    return NextResponse.json({ data: settings })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate request body
    if (body.reminder_message_template !== undefined && typeof body.reminder_message_template !== 'string') {
      return NextResponse.json(
        { error: 'Invalid message template format' },
        { status: 400 }
      )
    }
    
    const settings = await updateTherapistSettings(body)
    return NextResponse.json({ data: settings })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    )
  }
}

