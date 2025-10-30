import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET - Fetch credentials
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: therapist, error } = await supabase
      .from('therapists')
      .select('therapynotes_username, therapynotes_password, therapynotes_practice_code')
      .eq('id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: 'Failed to fetch credentials' }, { status: 500 })
    }

    return NextResponse.json({
      username: therapist?.therapynotes_username || '',
      password: therapist?.therapynotes_password || '',
      practiceCode: therapist?.therapynotes_practice_code || ''
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to fetch credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// PUT - Update credentials
export async function PUT(request: Request) {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { username, password, practiceCode } = await request.json()

    // Update therapist credentials
    const { error } = await supabase
      .from('therapists')
      .update({
        therapynotes_username: username || null,
        therapynotes_password: password || null,
        therapynotes_practice_code: practiceCode || null
      })
      .eq('id', user.id)

    if (error) {
      return NextResponse.json({ 
        error: 'Failed to update credentials',
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'Credentials updated successfully' 
    })

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to update credentials',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

