// TherapyNotes Login Handler
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, password, practiceCode } = await req.json()

    // Step 1: Submit practice code
    const step1Response = await fetch(
      'https://www.therapynotes.com/app/session/processlogin.aspx?msg=3',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Origin': 'https://www.therapynotes.com',
          'Referer': 'https://www.therapynotes.com/app/login/',
          'Cookie': 'timezone-offset=-240; cookie-detection=1',
        },
        body: new URLSearchParams({
          'practicecode': practiceCode,
          'docookiecheck': 'true',
          'correlationid': crypto.randomUUID(),
          'tnv': '2025.8.2.48.324718'
        }).toString(),
        redirect: 'manual'
      }
    )

    if (!step1Response.ok) {
      throw new Error(`Step 1 failed: ${step1Response.status}`)
    }

    // Collect cookies from Step 1
    const cookiesFromStep1: string[] = []
    step1Response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        cookiesFromStep1.push(value.split(';')[0])
      }
    })

    // Step 2: Submit username + password
    const passwordHash = await hashPassword(password)
    const allCookies = [
      'timezone-offset=-240',
      'cookie-detection=1',
      ...cookiesFromStep1
    ].join('; ')

    const step2Response = await fetch(
      'https://www.therapynotes.com/app/session/processlogin.aspx?msg=4',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Origin': 'https://www.therapynotes.com',
          'Referer': 'https://www.therapynotes.com/app/login/',
          'Cookie': allCookies,
        },
        body: new URLSearchParams({
          'msg': '4',
          'password': passwordHash,
          'agreetos': 'false',
          'docookiecheck': 'true',
          'username': username,
          'e-username': btoa(practiceCode),
          'twofactorreentryskipfornow': 'false',
          'correlationid': crypto.randomUUID(),
          'tnv': '2025.8.2.48.324718'
        }).toString(),
        redirect: 'manual'
      }
    )

    if (!step2Response.ok) {
      throw new Error(`Step 2 failed: ${step2Response.status}`)
    }

    // Extract access token and session ID
    let accessToken = null
    let sessionId = null
    
    step2Response.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'set-cookie') {
        const cookie = value.split(';')[0]
        if (cookie.includes('access-token=')) {
          accessToken = cookie.split('=')[1]
        }
        if (cookie.includes('ASP.NET_SessionId=')) {
          sessionId = cookie.split('=')[1]
        }
      }
    })

    if (!accessToken) {
      throw new Error('Login failed: No access token received')
    }

    return new Response(
      JSON.stringify({
        success: true,
        accessToken,
        sessionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('TherapyNotes login error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-512', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}
