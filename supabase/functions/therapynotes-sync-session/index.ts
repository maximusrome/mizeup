// TherapyNotes Sync Session Handler
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

// Default appointment settings
const DEFAULT_SERVICE_CODE = 4217196
const DEFAULT_LOCATION_ID = 32291

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { username, password, practiceCode, clientName, date, startTime, endTime } = await req.json()

    const { accessToken, sessionId } = await loginToTherapyNotes(username, password, practiceCode)
    if (!accessToken) throw new Error('Login failed')

    const cookies = `${BASE_COOKIES}; access-token=${accessToken}; ASP.NET_SessionId=${sessionId}`
    
    const patient = await searchPatient(clientName, cookies)
    if (!patient) throw new Error(`Patient not found: ${clientName}`)

    const appointment = await createAppointment(patient, date, startTime, cookies)

    return new Response(
      JSON.stringify({ success: true, appointmentId: appointment.ID }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed'
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

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

async function searchPatient(clientName: string, cookies: string) {
  const response = await fetch('https://www.therapynotes.com/app/common/searchforpatient.aspx?msg=20', {
    method: 'POST',
    headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/', 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({
      msg: '20',
      searchquery: clientName,
      practiceid: '-1',
      assigneduserid: '-1',
      param: JSON.stringify({ ExcludedPatients: [], AssignedPatientsOnlyIfNoSearchTerms: true }),
      correlationid: crypto.randomUUID(),
      tnrac: TN_RAC
    }).toString()
  })

  const { Matches } = await response.json()
  return Matches?.[0] || null
}

async function createAppointment(patient: any, date: string, startTime: string, cookies: string) {
  const [year, month, day] = date.split('-')
  const [hours, minutes] = startTime.split(':').map(Number)
  
  const response = await fetch('https://www.therapynotes.com/app/scheduling/savecalendarentry.aspx?msg=25', {
    method: 'POST',
    headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/', 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({
      msg: '25',
      entry: JSON.stringify({
        ID: -1,
        Type: 1,
        StartDate: `${month}/${day}/${year}`,
        StartTime: `${hours % 12 || 12}:${minutes.toString().padStart(2, '0')}${hours >= 12 ? 'PM' : 'AM'}`,
        Duration: "60",
        Clinician: JSON.parse(patient.AssignedClinicians)[0],
        Patients: [{
          ID: patient.ID,
          FirstName: patient.FirstName,
          MiddleName: patient.MiddleName || "",
          LastName: patient.LastName,
          Nickname: patient.Nickname || "",
          DOB: patient.DOB || "",
          EncryptedID: patient.EncryptedID,
          PortalUserId: patient.PortalUserId || -1,
          Suffix: patient.Suffix || "",
          AssignedClinicians: JSON.parse(patient.AssignedClinicians)
        }],
        ServiceCode: DEFAULT_SERVICE_CODE,
        LocationType: 1,
        LocationID: DEFAULT_LOCATION_ID,
        WorkLocationId: DEFAULT_LOCATION_ID
      }),
      overridewarnings: 'true',
      showtelehealthwarning: 'false',
      correlationid: crypto.randomUUID(),
      tnrac: TN_RAC
    }).toString()
  })

  const result = await response.json()
  if (!result.Success) throw new Error(result.Errors?.join(', ') || 'Failed to create appointment')
  
  return result
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-512', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

