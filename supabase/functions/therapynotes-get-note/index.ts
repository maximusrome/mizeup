// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TN_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Origin': 'https://www.therapynotes.com',
}

const BASE_COOKIES = 'timezone-offset=-240; cookie-detection=1'
const TN_RAC = 'BfcAAAAAAAD2ZJ40MeN_Gk1SkcfxW0mJoaa6g0Dn4n6NQfPwUKKXEw'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { encryptedCalendarEntryId, encryptedPatientId, username, password, practiceCode } = await req.json()
    if (!encryptedCalendarEntryId || !encryptedPatientId) {
      return json({ success: false, error: 'Missing identifiers' }, 400)
    }

    const { accessToken, sessionId } = await loginToTherapyNotes(username, password, practiceCode)
    if (!accessToken || !sessionId) throw new Error('Login failed')

    const cookies = `${BASE_COOKIES}; access-token=${accessToken}; ASP.NET_SessionId=${sessionId}`
    const note = await getNote(encryptedCalendarEntryId, encryptedPatientId, cookies)

    const elems = note?.Form?.Data?.FormElementValues || []
    const dx = elems.find((el: any) => el.FormElementId === 13009)?.Value?.NoteDiagnoses || []
    const diagnoses = dx.map((d: any) => ({ code: d.Code, description: d.Description }))
    const objectives = elems.find((el: any) => el.FormElementId === 13008)?.Value?.ObjectivesProgress || []

    return json({ success: true, diagnoses, objectives })
  } catch (error) {
    return json({ success: false, error: error instanceof Error ? error.message : 'Failed' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } })
}

async function loginToTherapyNotes(username: string, password: string, practiceCode: string) {
  const step1 = await fetch('https://www.therapynotes.com/app/session/processlogin.aspx?msg=3', {
    method: 'POST',
    headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/login/', 'Cookie': BASE_COOKIES },
    body: new URLSearchParams({
      practicecode: practiceCode,
      docookiecheck: 'true',
      correlationid: crypto.randomUUID()
    }).toString(),
    redirect: 'manual'
  })

  const step1Cookies = Array.from(step1.headers.entries())
    .filter(([k]) => k.toLowerCase() === 'set-cookie')
    .map(([, v]) => v.split(';')[0])

  const step2 = await fetch('https://www.therapynotes.com/app/session/processlogin.aspx?msg=4', {
    method: 'POST',
    headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/login/', 'Cookie': `${BASE_COOKIES}; ${step1Cookies.join('; ')}` },
    body: new URLSearchParams({
      msg: '4',
      password: await hashPassword(password),
      agreetos: 'false',
      docookiecheck: 'true',
      username,
      'e-username': btoa(practiceCode),
      twofactorreentryskipfornow: 'false',
      correlationid: crypto.randomUUID()
    }).toString(),
    redirect: 'manual'
  })

  const cookies = Array.from(step2.headers.entries())
    .filter(([k]) => k.toLowerCase() === 'set-cookie')
    .map(([, v]) => v.split(';')[0])

  const accessToken = cookies.find(c => c.includes('access-token='))?.split('=')[1]
  const sessionId = cookies.find(c => c.includes('ASP.NET_SessionId='))?.split('=')[1]

  return { accessToken, sessionId }
}

async function getNote(calendarEntryId: string, patientId: string, cookies: string) {
  const response = await fetch('https://www.therapynotes.com/app/notes/api/getnote.aspx?msg=3', {
    method: 'POST',
    headers: {
      ...TN_HEADERS,
      'Cookie': cookies,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.therapynotes.com/app/'
    },
    body: new URLSearchParams({
      msg: '3',
      notetype: '4',
      isediting: '1',
      encryptednotevalues: JSON.stringify({
        NoteId: null,
        NoteRevision: null,
        CalendarEntryId: calendarEntryId,
        PatientId: patientId,
        CustomFormId: null
      }),
      notetemplateid: 'null',
      customformid: 'null',
      customformversionid: 'null',
      wassaved: '0',
      isgroupnoteworkflow: '0',
      correlationid: crypto.randomUUID(),
      tnrac: TN_RAC
    }).toString()
  })

  return await response.json()
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-512', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}


