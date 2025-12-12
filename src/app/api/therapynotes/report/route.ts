import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type SupabaseClientType = Awaited<ReturnType<typeof createClient>>

interface ERARecord {
  ID: number
  [key: string]: unknown
}

interface ReportDBRecord {
  therapist_id: string
  date: string
  client_name: string
  service_code: string | null
  payer_name: string | null
  charged_amount: number | null
  insurance_paid: number | null
  patient_responsibility: number | null
  note_status: string | null
  last_synced_at: string
}

type SessionRecord = {
  id: string
  date: string
  clients: { name: string } | null
}

interface NoteRecord {
  session_id: string
  synced_to_therapynotes: boolean
}

interface SessionWithNote {
  date: string
  clientName: string
}

const TN_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Origin': 'https://www.therapynotes.com',
  'X-Requested-With': 'XMLHttpRequest',
}

const BASE_COOKIES = 'timezone-offset=-300; cookie-detection=1'
const TN_RAC = 'BfcAAAAAAAD2ZJ40MeN_Gk1SkcfxW0mJoaa6g0Dn4n6NQfPwUKKXEw'

// Decode HTML entities (like &#39; to ')
function decodeHtmlEntities(text: string): string {
  if (!text) return text
  // Common HTML entities map
  const entities: Record<string, string> = {
    '&#39;': "'",
    '&#x27;': "'",
    '&apos;': "'",
    '&quot;': '"',
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&nbsp;': ' '
  }
  
  // Replace numeric entities like &#39;
  text = text.replace(/&#(\d+);/g, (match, dec) => String.fromCharCode(parseInt(dec, 10)))
  
  // Replace hex entities like &#x27;
  text = text.replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => String.fromCharCode(parseInt(hex, 16)))
  
  // Replace named entities
  Object.entries(entities).forEach(([entity, char]) => {
    text = text.replace(new RegExp(entity, 'g'), char)
  })
  
  return text
}

// Helper function to format name properly (handles apostrophes like O'Rourke)
function formatName(name: string): string {
  if (!name) return ''
  
  // Decode HTML entities first
  name = decodeHtmlEntities(name.trim())
  
  // Split by spaces and format each word
  return name.split(' ')
    .filter(Boolean)
    .map(part => {
      // Handle names with apostrophes (e.g., O'Rourke, D'Angelo)
      if (part.includes("'")) {
        return part.split("'")
          .map(subPart => subPart.charAt(0).toUpperCase() + subPart.slice(1).toLowerCase())
          .join("'")
      } else {
        // Regular word: capitalize first letter, lowercase rest
        return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
      }
    })
    .join(' ')
    .trim()
}

interface SessionData {
  serviceDate: string
  clientName: string
  serviceCode: string
  chargedAmount: number
  insurancePaid: number
  patientResponsibility: number
  payerName: string
}

interface ScheduleSession {
  date: string // MM/DD/YYYY
  startDateTime: string // ISO for sorting
  clientName: string
}

interface CombinedRow {
  schedule: ScheduleSession | null
  billing: SessionData[]
  hasSchedule: boolean
  hasBilling: boolean
  isDirectPay?: boolean
  noteStatus?: 'Note Synced' | 'Needs Note'
}

// Map of normalized client names to direct pay status
type DirectPayMap = Record<string, boolean>

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-512', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
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

  if (!accessToken || !sessionId) {
    throw new Error('Login failed - could not get access token')
  }

  return { accessToken, sessionId }
}

// Fetch schedule data for a specific month
async function fetchScheduleMonth(
  cookies: string, 
  year: number, 
  month: number, // 1-indexed (1 = January)
  clinicianId: number
): Promise<ScheduleSession[]> {
  // Create date range for the month
  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0, 23, 59, 59) // Last day of month
  
  const formatISODate = (d: Date) => {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const h = String(d.getHours()).padStart(2, '0')
    const min = String(d.getMinutes()).padStart(2, '0')
    const s = String(d.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${day}T${h}:${min}:${s}`
  }
  
  const requestSet = [
    {
      StartDate: formatISODate(startDate),
      EndDate: formatISODate(endDate),
      Calendar: -1,
      NeedWorkSchedule: false
    },
    {
      StartDate: formatISODate(startDate),
      EndDate: formatISODate(endDate),
      Calendar: clinicianId,
      NeedWorkSchedule: false
    }
  ]
  
  const response = await fetch('https://www.therapynotes.com/app/scheduling/loadschedule.aspx?msg=7', {
    method: 'POST',
    headers: { 
      ...TN_HEADERS, 
      'Referer': 'https://www.therapynotes.com/app/scheduling/', 
      'Cookie': cookies 
    },
    body: new URLSearchParams({
      msg: '7',
      requestset: JSON.stringify(requestSet),
      requestedviewname: 'month',
      correlationid: crypto.randomUUID(),
      tnrac: TN_RAC
    }).toString()
  })
  
  const data = await response.json()
  const sessions: ScheduleSession[] = []
  
  if (!data.CalendarItems || !Array.isArray(data.CalendarItems)) {
    return sessions
  }
  
  const patients = data.Patients || {}
  
  for (const item of data.CalendarItems) {
    // Skip cancelled sessions (status 3)
    if (item.Status === 3) continue
    
    // Skip non-therapy sessions (Type 0 = Intake, 1 = Therapy Session)
    // Include both intakes and sessions
    if (item.Type !== 0 && item.Type !== 1) continue
    
    // Get patient info
    const patientId = item.Patients?.[0]?.ID
    if (!patientId) continue
    
    const patient = patients[patientId]
    if (!patient) continue
    
    // Parse start date/time
    const startDateTime = item.StartDate // e.g., "2025-12-01T11:00:00"
    const dateObj = new Date(startDateTime)
    
    // Format date as MM/DD/YYYY
    const date = `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`
    
    // Build patient name - decode HTML entities in raw fields first
    const firstName = decodeHtmlEntities(patient.FirstName || '')
    const lastName = decodeHtmlEntities(patient.LastName || '')
    const middleName = decodeHtmlEntities(patient.MiddleName || '')
    
    let clientName = ''
    if (firstName && lastName) {
      clientName = middleName 
        ? `${firstName} ${middleName} ${lastName}` 
        : `${firstName} ${lastName}`
    } else if (firstName || lastName) {
      clientName = firstName || lastName
    }
    
    // Format name properly (handles apostrophes like O'Rourke)
    clientName = formatName(clientName)
    
    sessions.push({
      date,
      startDateTime,
      clientName
    })
  }
  
  return sessions
}

// Fetch schedule data for the current year
async function fetchSchedule(cookies: string, clinicianId: number): Promise<ScheduleSession[]> {
  const now = new Date()
  const allSessions: ScheduleSession[] = []
  const monthsToFetch: Array<{year: number, month: number}> = []
  
  // Get current year - January 1 to today
  const startDate = new Date(now.getFullYear(), 0, 1)
  
  // Build list of months to fetch
  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
  while (current <= now) {
    monthsToFetch.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1 // 1-indexed
    })
    current.setMonth(current.getMonth() + 1)
  }
  
  // Fetch each month
  for (const { year, month } of monthsToFetch) {
    try {
      const sessions = await fetchScheduleMonth(cookies, year, month, clinicianId)
      allSessions.push(...sessions)
    } catch (err) {
      console.error(`Failed to fetch schedule for ${month}/${year}:`, err)
    }
  }
  
  // Filter to only include sessions within the current year
  const cutoffDate = new Date(now.getFullYear(), 0, 1)
  cutoffDate.setHours(0, 0, 0, 0)
  
  const filteredSessions = allSessions.filter(session => {
    const sessionDate = new Date(session.startDateTime)
    return sessionDate >= cutoffDate && sessionDate <= now
  })
  
  // Sort by date/time (oldest first)
  filteredSessions.sort((a, b) => 
    new Date(a.startDateTime).getTime() - new Date(b.startDateTime).getTime()
  )
  
  return filteredSessions
}

// Get clinician ID from session token or use default
async function getClinicianId(cookies: string): Promise<number> {
  const tokenMatch = cookies.match(/access-token=([^;]+)/)
  if (tokenMatch) {
    try {
      const token = tokenMatch[1]
      const parts = token.split('.')
      if (parts.length >= 2) {
        const payload = JSON.parse(atob(parts[1]))
        const userClaims = payload.UserClaim || []
        for (const claim of userClaims) {
          if (claim.startsWith('UserId;')) {
            return parseInt(claim.split(';')[1], 10)
          }
        }
      }
    } catch {
      // Use default if token parsing fails
    }
  }
  
  return 63237
}

async function fetchERAs(cookies: string, startDate: string, endDate: string): Promise<ERARecord[]> {
  const allERAs: ERARecord[] = []
  let page = 1
  let hasMorePages = true

  while (hasMorePages) {
    const response = await fetch('https://www.therapynotes.com/app/billing/eras/searcheras.aspx?msg=3', {
      method: 'POST',
      headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/billing/eras/', 'Cookie': cookies },
      body: new URLSearchParams({
        msg: '3',
        status: '-1',
        insuranceprovider: '',
        patient: '',
        payee: '',
        receiveddaterangestart: startDate,
        receiveddaterangeend: endDate,
        eranumber: '',
        page: page.toString(),
        correlationid: crypto.randomUUID(),
        tnrac: TN_RAC
      }).toString()
    })

    const data = await response.json()
    const eras = data.ERAs || []
    
    if (eras.length === 0) {
      hasMorePages = false
    } else {
      allERAs.push(...eras)
      const totalPages = data.PageCount || 1
      if (page >= totalPages) {
        hasMorePages = false
      } else {
        page++
      }
    }
  }

  return allERAs
}

function parseAmount(str: string): number {
  if (!str) return 0
  let cleaned = str.trim()
  
  // Handle negative values in parentheses like ($10.00) or (10.00)
  const isNegative = cleaned.startsWith('(') && cleaned.endsWith(')')
  if (isNegative) {
    cleaned = cleaned.slice(1, -1).trim() // Remove parentheses
  }
  
  // Remove $ signs and commas
  cleaned = cleaned.replace(/[$,]/g, '').trim()
  
  const amount = parseFloat(cleaned) || 0
  return isNegative ? -amount : amount
}

// Parse MM/DD/YYYY date string to timestamp for reliable sorting
function parseDateToTimestamp(dateStr: string): number {
  const parts = dateStr.split('/')
  if (parts.length !== 3) return 0
  const month = parseInt(parts[0], 10) - 1 // JS months are 0-indexed
  const day = parseInt(parts[1], 10)
  const year = parseInt(parts[2], 10)
  const date = new Date(year, month, day)
  return isNaN(date.getTime()) ? 0 : date.getTime()
}

async function fetchERADetails(eraId: number, cookies: string): Promise<SessionData[]> {
  const response = await fetch(`https://www.therapynotes.com/app/billing/eras/view/${eraId}/`, {
    method: 'GET',
    headers: { 
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Cookie': cookies,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  })

  const html = await response.text()
  const sessions: SessionData[] = []

  // Extract payer name from the payernameandid-container
  const payerMatch = html.match(/data-testid="payernameandid-container"[^>]*>\s*([^<(]+)/i)
  const payerName = payerMatch ? decodeHtmlEntities(payerMatch[1].trim()) : 'Unknown Payer'

  // Build claim headers map for fallback patient names
  // Extract claim headers: <strong data-testid="patient-container...">LASTNAME, FIRSTNAME - ID</strong>
  const claimHeaders: Array<{ name: string, startIndex: number }> = []
  const claimHeaderPattern = /<strong[^>]*data-testid="patient-container[^"]*"[^>]*>([^<]+)<\/strong>/gi
  let claimMatch
  
  while ((claimMatch = claimHeaderPattern.exec(html)) !== null) {
    const patientHeader = claimMatch[1].trim()
    const claimIndex = claimMatch.index
    
    // Format: "LASTNAME, FIRSTNAME MIDDLENAME - ID" or similar
    const patientNamePart = patientHeader.split(' - ')[0] // Remove ID part
    let claimPatientName = patientNamePart
    
    if (patientNamePart.includes(',')) {
      // Format: "LASTNAME, FIRSTNAME MIDDLENAME"
      const parts = patientNamePart.split(',').map(p => p.trim())
      claimPatientName = parts.length > 1 ? `${parts[1]} ${parts[0]}`.trim() : patientNamePart
    }
    
    claimHeaders.push({
      name: formatName(claimPatientName),
      startIndex: claimIndex
    })
  }

  // Find all <tr> elements and check each for service data
  const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch
  let currentClaimIndex = -1

  while ((trMatch = trPattern.exec(html)) !== null) {
    const fullRowHtml = trMatch[0] // Full <tr>...</tr> including opening tag
    const rowContent = trMatch[1] // Just the content between tags
    const rowIndex = trMatch.index
    
    // Find the most recent claim header before this row
    for (let i = claimHeaders.length - 1; i >= 0; i--) {
      if (claimHeaders[i].startIndex < rowIndex) {
        currentClaimIndex = i
        break
      }
    }
    
    // Check if this row contains a claim header
    if (fullRowHtml.includes('patient-container')) {
      const claimInRowMatch = fullRowHtml.match(/data-testid="patient-container[^"]*"[^>]*>([^<]+)<\/strong>/i)
      if (claimInRowMatch) {
        for (let i = 0; i < claimHeaders.length; i++) {
          if (Math.abs(claimHeaders[i].startIndex - rowIndex) < 100) {
            currentClaimIndex = i
            break
          }
        }
      }
    }
    
    // Must have both service code and date containers to be a service row
    if (!rowContent.includes('servicecode-container') || !rowContent.includes('dateofservice-container')) {
      continue
    }
    
    // Extract data-patient attribute from anywhere in the row HTML
    const patientAttrMatch = fullRowHtml.match(/data-patient="([^"]+)"/i)
    const patientAttr = patientAttrMatch ? patientAttrMatch[1] : null
    
    // Skip rows with data-patient="all" - these are header/total rows
    if (patientAttr && patientAttr.toLowerCase() === 'all') {
      continue
    }

    // Extract service code (5-digit CPT code)
    const codeMatch = rowContent.match(/data-testid="servicecode-container[^"]*"[^>]*>\s*(\d{5})/i)
    if (!codeMatch) {
      continue
    }
    const serviceCode = codeMatch[1]

    // Extract service date - must be present
    const dateMatch = rowContent.match(/data-testid="dateofservice-container[^"]*"[^>]*>[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})/i)
    if (!dateMatch) {
      continue
    }
    const serviceDate = dateMatch[1]
    
    // Validate date format
    const serviceTimestamp = parseDateToTimestamp(serviceDate)
    if (serviceTimestamp === 0) {
      continue
    }

    // Extract client name - try multiple strategies
    let clientName = ''
    
    // Strategy 1: Extract from data-patient attribute
    if (patientAttr && patientAttr.trim() && patientAttr.toLowerCase() !== 'all') {
      const nameParts = patientAttr.split('|').map(p => p.trim())
      let firstName = ''
      let middleName = ''
      let lastName = ''
      
      if (nameParts.length >= 3) {
        firstName = nameParts[0] || ''
        middleName = nameParts[1] || ''
        lastName = nameParts[2] || ''
      } else if (nameParts.length === 2) {
        firstName = nameParts[0] || ''
        lastName = nameParts[1] || ''
      } else if (nameParts.length === 1 && nameParts[0]) {
        firstName = nameParts[0] || ''
      }
      
      const nameComponents = [firstName, middleName, lastName].filter(Boolean)
      if (nameComponents.length > 0) {
        clientName = formatName(nameComponents.join(' '))
      }
    }
    
    // Strategy 2: Use the most recent claim header
    if ((!clientName || clientName.length < 2) && currentClaimIndex >= 0 && claimHeaders[currentClaimIndex]) {
      clientName = claimHeaders[currentClaimIndex].name
    }
    
    // Strategy 3: Search backwards for nearest claim header
    if (!clientName || clientName.length < 2) {
      let bestClaimIndex = -1
      let bestDistance = Infinity
      
      for (let i = 0; i < claimHeaders.length; i++) {
        if (claimHeaders[i].startIndex < rowIndex) {
          const distance = rowIndex - claimHeaders[i].startIndex
          if (distance < bestDistance) {
            bestDistance = distance
            bestClaimIndex = i
          }
        }
      }
      
      if (bestClaimIndex >= 0 && claimHeaders[bestClaimIndex]) {
        clientName = claimHeaders[bestClaimIndex].name
      }
    }
    
    // Strategy 4: Search in nearby HTML context
    if (!clientName || clientName.length < 2) {
      const searchStart = Math.max(0, rowIndex - 10000)
      const searchEnd = Math.min(html.length, rowIndex + 1000)
      const searchContext = html.substring(searchStart, searchEnd)
      const contextClaimMatches = [...searchContext.matchAll(/<strong[^>]*data-testid="patient-container[^"]*"[^>]*>([^<]+)<\/strong>/gi)]
      
      let lastClaimBeforeRow: RegExpMatchArray | null = null
      for (const match of contextClaimMatches) {
        const matchPosition = searchStart + match.index!
        if (matchPosition < rowIndex) {
          lastClaimBeforeRow = match
        }
      }
      
      if (lastClaimBeforeRow) {
        const patientHeader = lastClaimBeforeRow[1].trim()
        const patientNamePart = patientHeader.split(' - ')[0]
        let claimPatientName = patientNamePart
        
        if (patientNamePart.includes(',')) {
          const parts = patientNamePart.split(',').map(p => p.trim())
          claimPatientName = parts.length > 1 ? `${parts[1]} ${parts[0]}`.trim() : patientNamePart
        }
        
        clientName = formatName(claimPatientName)
      }
    }
    
    if (!clientName || clientName.length < 2) {
      clientName = 'Unknown'
    }

    // Extract charged amount
    const chargedMatch = rowContent.match(/data-testid="chargedrate-container[^"]*"[^>]*>([^<]+)/i)
    const chargedAmount = chargedMatch ? parseAmount(chargedMatch[1]) : 0

    // Extract paid amount (insurance paid)
    const paidMatch = rowContent.match(/data-testid="paidamount-container[^"]*"[^>]*>([^<]+)/i)
    const insurancePaid = paidMatch ? parseAmount(paidMatch[1]) : 0

    // Patient responsibility = charged - insurance paid
    const patientResponsibility = chargedAmount - insurancePaid

    sessions.push({
      serviceDate,
      clientName,
      serviceCode,
      chargedAmount,
      insurancePaid,
      patientResponsibility,
      payerName
    })
  }

  return sessions
}

// Normalize name for matching
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/\b(iii|ii|iv|jr|sr)\b/gi, '')
    .trim()
}

// Check if two names match (fuzzy matching)
function namesMatch(name1: string, name2: string): boolean {
  const n1 = normalizeName(name1)
  const n2 = normalizeName(name2)
  
  if (n1 === n2) return true
  
  const parts1 = n1.split(' ').filter(Boolean)
  const parts2 = n2.split(' ').filter(Boolean)
  
  if (parts1.length >= 2 && parts2.length >= 2) {
    const firstName1 = parts1[0]
    const lastName1 = parts1[parts1.length - 1]
    const firstName2 = parts2[0]
    const lastName2 = parts2[parts2.length - 1]
    
    if (firstName1 === firstName2 && lastName1 === lastName2) {
      return true
    }
  }
  
  return false
}

// Fetch patient list and create a map of direct pay status by normalized client name
async function fetchDirectPayMap(cookies: string): Promise<DirectPayMap> {
  const directPayMap: DirectPayMap = {}
  
  try {
    // Fetch all active patients - need to paginate through all pages
    let page = 1
    let hasMorePages = true
    
    while (hasMorePages) {
      const response = await fetch('https://www.therapynotes.com/app/patients/loadpatientlist.aspx?msg=5', {
        method: 'POST',
        headers: {
          ...TN_HEADERS,
          'Referer': 'https://www.therapynotes.com/app/patients/',
          'Cookie': cookies
        },
        body: new URLSearchParams({
          msg: '5',
          manual: 'true',
          page: page.toString(),
          sortparameter: 'name',
          sortascending: 'true',
          patient: '',
          assignment: 'any',
          status: 'active',
          correlationid: crypto.randomUUID(),
          tnrac: TN_RAC
        }).toString()
      })
      
      const responseText = await response.text()
      
      interface PatientListResponse {
        Matches?: Array<{
          FirstName?: string
          LastName?: string
          MiddleName?: string
          InsuranceProvider?: string
        }>
        PageCount?: number
      }
      
      let data: PatientListResponse
      
      try {
        data = JSON.parse(responseText) as PatientListResponse
      } catch {
        // If response is not JSON, try to extract JSON from HTML
        const jsonMatch = responseText.match(/\{[\s\S]*"Matches"[\s\S]*\}/)
        if (jsonMatch) {
          data = JSON.parse(jsonMatch[0]) as PatientListResponse
        } else {
          console.error('Could not parse patient list response')
          hasMorePages = false
          break
        }
      }
      
      const patients = data.Matches || []
      
      if (patients.length === 0) {
        hasMorePages = false
        break
      }
      
      // Process each patient
      for (const patient of patients) {
        // Build patient name
        const firstName = decodeHtmlEntities(patient.FirstName || '')
        const lastName = decodeHtmlEntities(patient.LastName || '')
        const middleName = decodeHtmlEntities(patient.MiddleName || '')
        
        let clientName = ''
        if (firstName && lastName) {
          clientName = middleName 
            ? `${firstName} ${middleName} ${lastName}` 
            : `${firstName} ${lastName}`
        } else if (firstName || lastName) {
          clientName = firstName || lastName
        }
        
        if (!clientName) continue
        
        // Format name properly
        clientName = formatName(clientName)
        
        // Check if direct pay (no InsuranceProvider field or it's empty)
        const isDirectPay = !patient.InsuranceProvider || patient.InsuranceProvider.trim() === ''
        
        // Store in map using normalized name for matching
        const normalizedName = normalizeName(clientName)
        directPayMap[normalizedName] = isDirectPay
      }
      
      // Check if there are more pages
      const totalPages = data.PageCount || 1
      if (page >= totalPages) {
        hasMorePages = false
      } else {
        page++
      }
    }
  } catch (err) {
    console.error('Failed to fetch patient list for direct pay detection:', err)
    // Continue without direct pay info rather than failing
  }
  
  return directPayMap
}

// Save report rows to database (one row per table row)
async function saveReportRowsToDB(
  supabase: SupabaseClientType,
  therapistId: string,
  rows: CombinedRow[],
  startDate: Date,
  endDate: Date
): Promise<void> {
  // Delete old data for this date range
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]
  
  const { error: deleteError } = await supabase
    .from('report')
    .delete()
    .eq('therapist_id', therapistId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)

  if (deleteError) {
    console.error('Error deleting old report data:', deleteError)
  }

  // Flatten rows into database records (one per billing line, or one for schedule-only)
  const records: ReportDBRecord[] = []
  
  for (const row of rows) {
    const date = row.schedule?.date || row.billing[0]?.serviceDate
    const clientName = row.schedule?.clientName || row.billing[0]?.clientName
    
    if (!date || !clientName) continue
    
    // Convert MM/DD/YYYY to YYYY-MM-DD
    const [month, day, year] = date.split('/')
    const dbDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
    
    // If there's billing data, create one record per billing line
    if (row.billing.length > 0) {
      for (const billing of row.billing) {
        records.push({
          therapist_id: therapistId,
          date: dbDate,
          client_name: clientName,
          service_code: billing.serviceCode,
          payer_name: billing.payerName,
          charged_amount: billing.chargedAmount,
          insurance_paid: billing.insurancePaid,
          patient_responsibility: billing.patientResponsibility,
          note_status: row.noteStatus || null,
          last_synced_at: new Date().toISOString()
        })
      }
    } else {
      // Schedule-only row (no billing)
      const isDirectPay = row.isDirectPay || false
      
      records.push({
        therapist_id: therapistId,
        date: dbDate,
        client_name: clientName,
        service_code: null,
        payer_name: isDirectPay ? 'Direct' : null,
        charged_amount: null,
        insurance_paid: null,
        patient_responsibility: null,
        note_status: row.noteStatus || null,
        last_synced_at: new Date().toISOString()
      })
    }
  }

  if (records.length > 0) {
    const { error } = await supabase
      .from('report')
      .insert(records)

    if (error) {
      console.error('Error saving report data:', error)
      throw new Error(`Failed to save report data: ${error.message}`)
    }
  }
}

// Read report rows from database
async function getReportRowsFromDB(
  supabase: SupabaseClientType,
  therapistId: string,
  startDate: Date,
  endDate: Date
): Promise<CombinedRow[]> {
  const startDateStr = startDate.toISOString().split('T')[0]
  const endDateStr = endDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('report')
    .select('*')
    .eq('therapist_id', therapistId)
    .gte('date', startDateStr)
    .lte('date', endDateStr)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error reading report data:', error)
    throw new Error(`Failed to read report data: ${error.message}`)
  }

  if (!data || data.length === 0) {
    return []
  }

  // Group by date + client name to reconstruct CombinedRow structure
  const rowMap = new Map<string, CombinedRow>()
  
  for (const record of data as ReportDBRecord[]) {
    // Convert YYYY-MM-DD back to MM/DD/YYYY
    const [year, month, day] = record.date.split('-')
    const dateStr = `${parseInt(month)}/${parseInt(day)}/${year}`
    const key = `${dateStr}|${record.client_name}`
    
    if (!rowMap.has(key)) {
      // Create schedule if this is a schedule-only row (no service_code)
      const schedule = record.service_code ? null : {
        date: dateStr,
        startDateTime: new Date(record.date).toISOString(),
        clientName: record.client_name
      }
      
      rowMap.set(key, {
        schedule,
        billing: [],
        hasSchedule: !!schedule,
        hasBilling: false,
        isDirectPay: record.payer_name === 'Direct' ? true : undefined,
        noteStatus: record.note_status as 'Note Synced' | 'Needs Note' | undefined
      })
    }
    
    const row = rowMap.get(key)!
    
    // Add billing data if present
    if (record.service_code) {
      row.billing.push({
        serviceDate: dateStr,
        clientName: record.client_name,
        serviceCode: record.service_code,
        chargedAmount: record.charged_amount === null ? 0 : (typeof record.charged_amount === 'string' 
          ? parseFloat(record.charged_amount) || 0
          : record.charged_amount || 0),
        insurancePaid: record.insurance_paid === null ? 0 : (typeof record.insurance_paid === 'string'
          ? parseFloat(record.insurance_paid) || 0
          : record.insurance_paid || 0),
        patientResponsibility: record.patient_responsibility === null ? 0 : (typeof record.patient_responsibility === 'string'
          ? parseFloat(record.patient_responsibility) || 0
          : record.patient_responsibility || 0),
        payerName: record.payer_name || ''
      })
      row.hasBilling = true
    }
  }
  
  return Array.from(rowMap.values())
}

// Get note status for sessions from mizeup database
async function getNoteStatusForSessions(
  supabase: SupabaseClientType,
  therapistId: string,
  rows: CombinedRow[]
): Promise<void> {
  // Get all unique dates from rows
  const dates = new Set<string>()
  rows.forEach(row => {
    const date = row.schedule?.date || row.billing[0]?.serviceDate
    if (date) {
      // Convert MM/DD/YYYY to YYYY-MM-DD for database query
      const [month, day, year] = date.split('/')
      dates.add(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`)
    }
  })

  if (dates.size === 0) return

  // Fetch sessions and notes from mizeup database
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, date, clients:client_id(name)')
    .eq('therapist_id', therapistId)
    .in('date', Array.from(dates)) as { data: SessionRecord[] | null }

  if (!sessions || sessions.length === 0) return

  const sessionIds = sessions.map((s: SessionRecord) => s.id)
  const { data: notes } = await supabase
    .from('progress_notes')
    .select('session_id, synced_to_therapynotes')
    .eq('therapist_id', therapistId)
    .in('session_id', sessionIds)

  // Create map of session_id -> has synced note
  const syncedNotes = new Set(
    (notes || [])
      .filter((n: NoteRecord) => n.synced_to_therapynotes)
      .map((n: NoteRecord) => n.session_id)
  )

  // Create array of sessions with notes (for fuzzy matching)
  const sessionsWithNotes: SessionWithNote[] = sessions
    .filter((session) => syncedNotes.has(session.id))
    .map((session) => ({
      date: session.date,
      clientName: session.clients?.name || ''
    }))

  // Add status to rows using fuzzy name matching
  rows.forEach(row => {
    const date = row.schedule?.date || row.billing[0]?.serviceDate
    const clientName = row.schedule?.clientName || row.billing[0]?.clientName
    if (date && clientName) {
      // Convert MM/DD/YYYY to YYYY-MM-DD for matching
      const [month, day, year] = date.split('/')
      const dbDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      
      // Find matching session by date + fuzzy name match
      const matchingSession = sessionsWithNotes.find((session: SessionWithNote) => 
        session.date === dbDate && namesMatch(session.clientName, clientName)
      )
      
      row.noteStatus = matchingSession ? 'Note Synced' : 'Needs Note'
    }
  })
}

// Match schedule sessions to billing data
function matchSessionsToBilling(
  scheduleSessions: ScheduleSession[],
  billingSessions: SessionData[],
  directPayMap: DirectPayMap
): CombinedRow[] {
  const rows: CombinedRow[] = []
  const usedBillingIndices = new Set<number>()
  
  // For each schedule session, find matching billing entries
  for (const schedule of scheduleSessions) {
    const matchingBilling: SessionData[] = []
    
    for (let i = 0; i < billingSessions.length; i++) {
      if (usedBillingIndices.has(i)) continue
      
      const billing = billingSessions[i]
      
      // Match by date and name
      if (schedule.date === billing.serviceDate && namesMatch(schedule.clientName, billing.clientName)) {
        matchingBilling.push(billing)
        usedBillingIndices.add(i)
      }
    }
    
    // Check if this client is direct pay
    const normalizedScheduleName = normalizeName(schedule.clientName)
    const isDirectPay = directPayMap[normalizedScheduleName] || false
    
    rows.push({
      schedule,
      billing: matchingBilling,
      hasSchedule: true,
      hasBilling: matchingBilling.length > 0,
      isDirectPay: matchingBilling.length === 0 ? isDirectPay : undefined
    })
  }
  
  // Add unmatched billing entries (services without a schedule match)
  for (let i = 0; i < billingSessions.length; i++) {
    if (!usedBillingIndices.has(i)) {
      rows.push({
        schedule: null,
        billing: [billingSessions[i]],
        hasSchedule: false,
        hasBilling: true
      })
    }
  }
  
  // Sort by date (using schedule date if available, otherwise billing date)
  rows.sort((a, b) => {
    const timestampA = a.schedule 
      ? new Date(a.schedule.startDateTime).getTime() 
      : parseDateToTimestamp(a.billing[0]?.serviceDate || '')
    const timestampB = b.schedule 
      ? new Date(b.schedule.startDateTime).getTime() 
      : parseDateToTimestamp(b.billing[0]?.serviceDate || '')
    
    return timestampA - timestampB
  })
  
  return rows
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if refresh is requested
    const { searchParams } = new URL(req.url)
    const shouldRefresh = searchParams.get('refresh') === 'true'

    // Set date range: current year
    const endDate = new Date()
    endDate.setHours(23, 59, 59, 999)
    const startDate = new Date(endDate.getFullYear(), 0, 1) // January 1 of current year
    startDate.setHours(0, 0, 0, 0)

    let validBillingSessions: SessionData[] = []
    let scheduleSessions: ScheduleSession[] = []
    let directPayMap: DirectPayMap = {}

    // If refresh requested, fetch from TherapyNotes and save to DB
    if (shouldRefresh) {
      const { data: therapist, error } = await supabase
        .from('therapists')
        .select('therapynotes_username, therapynotes_password, therapynotes_practice_code')
        .eq('id', user.id)
        .single()

      if (error || !therapist?.therapynotes_username || !therapist?.therapynotes_password || !therapist?.therapynotes_practice_code) {
        return NextResponse.json({ 
          error: 'TherapyNotes credentials not configured',
          message: 'Please configure your TherapyNotes credentials in Account settings'
        }, { status: 400 })
      }

      const { accessToken, sessionId } = await loginToTherapyNotes(
        therapist.therapynotes_username,
        therapist.therapynotes_password,
        therapist.therapynotes_practice_code
      )

      const cookies = `${BASE_COOKIES}; access-token=${accessToken}; ASP.NET_SessionId=${sessionId}; practicecode=${therapist.therapynotes_practice_code}`
      
      // Get clinician ID for schedule fetch
      const clinicianId = await getClinicianId(cookies)
      
      // Fetch schedule sessions
      scheduleSessions = await fetchSchedule(cookies, clinicianId)

      // Fetch patient list to identify direct pay clients
      directPayMap = await fetchDirectPayMap(cookies)

      // Fetch ERA billing data
      const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
      const eras = await fetchERAs(cookies, formatDate(startDate), formatDate(endDate))

      const allBillingSessions: SessionData[] = []
      
      for (const era of eras) {
        try {
          const sessions = await fetchERADetails(era.ID, cookies)
          if (sessions.length > 0) {
            allBillingSessions.push(...sessions)
          }
        } catch (err) {
          console.error(`Failed to fetch ERA ${era.ID}:`, err)
        }
      }

      // Validate billing sessions and filter by service date (current year)
      validBillingSessions = allBillingSessions.filter(session => {
        if (!session.clientName || session.clientName.length < 2) return false
        if (!session.serviceDate || !/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(session.serviceDate)) return false
        if (!session.serviceCode || !/^\d{5}$/.test(session.serviceCode)) return false
        
        const serviceTimestamp = parseDateToTimestamp(session.serviceDate)
        if (serviceTimestamp === 0) return false
        const serviceDateObj = new Date(serviceTimestamp)
        return serviceDateObj >= startDate && serviceDateObj <= endDate
      })

      // Match schedule to billing
      const combinedRows = matchSessionsToBilling(scheduleSessions, validBillingSessions, directPayMap)
      
      // Add note status from mizeup database
      await getNoteStatusForSessions(supabase, user.id, combinedRows)
      
      // Save complete report rows to database
      await saveReportRowsToDB(supabase, user.id, combinedRows, startDate, endDate)
      
      // Calculate totals
      const totals = {
        totalCharged: validBillingSessions.reduce((sum, s) => sum + s.chargedAmount, 0),
        totalInsurancePaid: validBillingSessions.reduce((sum, s) => sum + s.insurancePaid, 0),
        totalPatientResponsibility: validBillingSessions.reduce((sum, s) => sum + s.patientResponsibility, 0),
        totalScheduledSessions: scheduleSessions.length,
        totalBilledServices: validBillingSessions.length
      }

      return NextResponse.json({ 
        rows: combinedRows,
        totals
      })
    } else {
      // Read from database only - no TherapyNotes API calls
      const combinedRows = await getReportRowsFromDB(supabase, user.id, startDate, endDate)
      
      // Calculate totals from stored rows
      const totals = {
        totalCharged: combinedRows.reduce((sum, row) => 
          sum + row.billing.reduce((s, b) => s + b.chargedAmount, 0), 0),
        totalInsurancePaid: combinedRows.reduce((sum, row) => 
          sum + row.billing.reduce((s, b) => s + b.insurancePaid, 0), 0),
        totalPatientResponsibility: combinedRows.reduce((sum, row) => 
          sum + row.billing.reduce((s, b) => s + b.patientResponsibility, 0), 0),
        totalScheduledSessions: combinedRows.filter(r => r.hasSchedule).length,
        totalBilledServices: combinedRows.reduce((sum, row) => sum + row.billing.length, 0)
      }

      return NextResponse.json({ 
        rows: combinedRows,
        totals
      })
    }

  } catch (error) {
    console.error('Report fetch error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch report data',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

