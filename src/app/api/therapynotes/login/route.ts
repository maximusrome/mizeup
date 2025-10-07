import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function POST() {
  try {
    const supabase = await createClient()
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get therapist credentials from database
    const { data: therapist, error: dbError } = await supabase
      .from('therapists')
      .select('therapynotes_username, therapynotes_password, therapynotes_practice_code')
      .eq('id', user.id)
      .single()

    if (dbError || !therapist) {
      return NextResponse.json({ 
        error: 'TherapyNotes credentials not found. Please add them in your account settings.' 
      }, { status: 404 })
    }

    if (!therapist.therapynotes_username || !therapist.therapynotes_password || !therapist.therapynotes_practice_code) {
      return NextResponse.json({ 
        error: 'Incomplete TherapyNotes credentials. Please update them in your account settings.' 
      }, { status: 400 })
    }

    // Call the login function
    const { data, error } = await supabase.functions.invoke('therapynotes-login', {
      body: {
        username: therapist.therapynotes_username,
        password: therapist.therapynotes_password,
        practiceCode: therapist.therapynotes_practice_code
      }
    })

    if (error) {
      return NextResponse.json({ 
        error: 'Login failed', 
        details: error.message 
      }, { status: 500 })
    }

    return NextResponse.json(data)

  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to login',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

