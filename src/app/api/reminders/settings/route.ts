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
    const settings = await updateTherapistSettings(body)
    return NextResponse.json({ data: settings })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update settings' },
      { status: 500 }
    )
  }
}

