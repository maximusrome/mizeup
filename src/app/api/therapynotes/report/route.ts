import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const TN_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Origin': 'https://www.therapynotes.com',
  'X-Requested-With': 'XMLHttpRequest',
}

const BASE_COOKIES = 'timezone-offset=-300; cookie-detection=1'
const TN_RAC = 'BfcAAAAAAAD2ZJ40MeN_Gk1SkcfxW0mJoaa6g0Dn4n6NQfPwUKKXEw'

const decodeHtml = (s: string) => s ? s.replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)))
  .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&nbsp;/g, ' ') : s

const formatName = (n: string) => !n ? '' : decodeHtml(n.trim()).split(' ').filter(Boolean)
  .map(p => p.includes("'") ? p.split("'").map(s => s[0]?.toUpperCase() + s.slice(1).toLowerCase()).join("'") : p[0]?.toUpperCase() + p.slice(1).toLowerCase())
  .join(' ')

const normalizeName = (n: string) => {
  const parts = n.toLowerCase().replace(/\s+/g, ' ').replace(/\b(iii|ii|iv|jr|sr)\b/gi, '').trim().split(' ').filter(Boolean)
  // Match on first and last name only, ignore middle names
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1]}`
  }
  return parts.join(' ')
}

const parseAmount = (s: string) => {
  if (!s) return 0
  const str = s.trim()
  const neg = str.startsWith('(') && str.endsWith(')')
  return (neg ? -1 : 1) * (parseFloat((neg ? str.slice(1, -1) : str).replace(/[$,]/g, '')) || 0)
}

const normalizeDate = (d: string) => {
  const [m, d2, y] = d.split('/')
  return y && m && d2 ? `${y}-${m.padStart(2, '0')}-${d2.padStart(2, '0')}` : d
}

const formatTime = (time: string) => {
  if (!time) return ''
  // If already formatted (contains AM/PM), return as-is
  if (time.includes('AM') || time.includes('PM')) return time
  // Otherwise, format from 24-hour to 12-hour
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours, 10)
  if (isNaN(hour)) return time
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

// Helper to get raw 24-hour time for sorting/comparison
const getRawTime = (formattedTime: string): string | null => {
  if (!formattedTime) return null
  // If already in 24-hour format, return as-is
  if (!formattedTime.includes('AM') && !formattedTime.includes('PM')) return formattedTime
  // Convert "2:00 PM" back to "14:00"
  const match = formattedTime.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return null
  let hour = parseInt(match[1], 10)
  const minutes = match[2]
  const ampm = match[3].toUpperCase()
  
  if (ampm === 'PM' && hour !== 12) hour += 12
  if (ampm === 'AM' && hour === 12) hour = 0
  
  return `${String(hour).padStart(2, '0')}:${minutes}`
}

interface ERAEntry {
  serviceDate: string
  clientName: string
  serviceCode: string
  chargedAmount: number
  insurancePaid: number
  patientResponsibility: number
  payerName: string
  remainder: number
}

interface StatementService {
  ServiceCodeText: string
  PatientRate?: number
  InsuranceRate?: number
  AmountToClaimToInsurance?: number
  ProcedureModifierCodes?: string[]
}

interface StatementItem {
  RecordType?: number
  Date: string
  Time?: string
  PatientFirstName: string
  PatientLastName: string
  Services: StatementService[]
  InsurancePayerName?: string
  PaymentMethod: number
}

interface StatementResponse {
  Items: StatementItem[]
  TotalPages: number
}

interface ReportItem {
  date: string
  time?: string
  patientName: string
  serviceCode: string
  serviceCodes: string[]
  payer: string
  rate: number
  addOnServices: Array<{ serviceCode: string; serviceCodes: string[]; rate: number }>
  eraData: ERAEntry[]
}

const getCookies = (res: Response) =>
  Array.from(res.headers.entries())
    .filter(([k]) => k.toLowerCase() === 'set-cookie')
    .map(([, v]) => v.split(';')[0])

const hashPassword = async (pwd: string) => {
  const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(pwd))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}

async function loginToTherapyNotes(username: string, password: string, practiceCode: string) {
  const step1 = await fetch('https://www.therapynotes.com/app/session/processlogin.aspx?msg=3', {
    method: 'POST',
    headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/login/', 'Cookie': BASE_COOKIES },
    body: new URLSearchParams({ practicecode: practiceCode, docookiecheck: 'true', correlationid: crypto.randomUUID() }).toString(),
    redirect: 'manual'
  })

  const cookies1 = getCookies(step1).join('; ')
  const step2 = await fetch('https://www.therapynotes.com/app/session/processlogin.aspx?msg=4', {
    method: 'POST',
    headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/login/', 'Cookie': `${BASE_COOKIES}; ${cookies1}` },
    body: new URLSearchParams({
      msg: '4', password: await hashPassword(password), agreetos: 'false',
      docookiecheck: 'true', username, 'e-username': btoa(practiceCode),
      twofactorreentryskipfornow: 'false', correlationid: crypto.randomUUID()
    }).toString(),
    redirect: 'manual'
  })

  const cookies2 = getCookies(step2)
  const accessToken = cookies2.find(c => c.includes('access-token='))?.split('=')[1]
  const sessionId = cookies2.find(c => c.includes('ASP.NET_SessionId='))?.split('=')[1]
  if (!accessToken || !sessionId) throw new Error('Login failed')
  return { accessToken, sessionId }
}

async function fetchERAs(cookies: string, startDate: string, endDate: string) {
  const eras: { ID: number }[] = []
  let page = 1
  
  while (true) {
    const data = await (await fetch('https://www.therapynotes.com/app/billing/eras/searcheras.aspx?msg=3', {
      method: 'POST',
      headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/billing/eras/', 'Cookie': cookies },
      body: new URLSearchParams({
        msg: '3', status: '-1', insuranceprovider: '', patient: '', payee: '',
        receiveddaterangestart: startDate, receiveddaterangeend: endDate,
        eranumber: '', page: page.toString(), correlationid: crypto.randomUUID(), tnrac: TN_RAC
      }).toString()
    })).json()
    
    if (!data.ERAs?.length) break
    eras.push(...data.ERAs)
    
    const totalPages = data.PageCount || 1
    if (page >= totalPages) break
    page++
  }
  
  return eras
}

async function fetchERADetails(eraId: number, cookies: string): Promise<ERAEntry[]> {
  const html = await (await fetch(`https://www.therapynotes.com/app/billing/eras/view/${eraId}/`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Cookie': cookies }
  })).text()
  
  const payerName = decodeHtml((html.match(/data-testid="payernameandid-container"[^>]*>\s*([^<(]+)/i)?.[1]?.trim() || 'Unknown Payer'))
  const entries: ERAEntry[] = []
  
  const headers: Array<{ name: string, idx: number }> = []
  const headerPattern = /<strong[^>]*data-testid="patient-container[^"]*"[^>]*>([^<]+)<\/strong>/gi
  let match
  while ((match = headerPattern.exec(html))) {
    const namePart = match[1].trim().split(' - ')[0]
    const name = namePart.includes(',') ? namePart.split(',').map(p => p.trim()).slice(1).concat(namePart.split(',')[0]).join(' ').trim() : namePart
    headers.push({ name: formatName(name), idx: match.index })
  }
  
  const trPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/gi
  let trMatch
  
  while ((trMatch = trPattern.exec(html))) {
    const [fullRow, content] = trMatch
    const idx = trMatch.index
    
    let claimIdx = -1
    for (let i = headers.length - 1; i >= 0; i--) {
      if (headers[i].idx < idx) { claimIdx = i; break }
    }
    
    if (!content.includes('servicecode-container') || !content.includes('dateofservice-container')) continue
    if (fullRow.match(/data-patient="([^"]+)"/i)?.[1]?.toLowerCase() === 'all') continue
    
    const code = content.match(/data-testid="servicecode-container[^"]*"[^>]*>\s*(\d{5})/i)?.[1]
    const date = content.match(/data-testid="dateofservice-container[^"]*"[^>]*>[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1]
    if (!code || !date) continue
    
    const patientAttr = fullRow.match(/data-patient="([^"]+)"/i)?.[1]
    const clientName = patientAttr && patientAttr !== 'all'
      ? formatName(patientAttr.split('|').slice(0, 3).map(p => p.trim()).filter(Boolean).join(' '))
      : (claimIdx >= 0 ? headers[claimIdx].name : 'Unknown')
    
    const extractAmount = (pattern: string) => {
      const match = content.match(new RegExp(pattern, 'i'))
      const value = match?.[1]?.trim() || '0'
      return Math.abs(parseAmount(value))
    }
    const chargedMatch = content.match(/data-testid="chargedrate-container[^"]*"[^>]*>\s*([^<]+)/i)
    const chargedAmount = parseAmount(chargedMatch?.[1]?.trim() || '0')
    
    const entry = {
      serviceDate: date,
      clientName,
      serviceCode: code,
      chargedAmount,
      insurancePaid: extractAmount('data-testid="paidamount-container[^"]*"[^>]*>\\s*([^<]+)'),
      patientResponsibility: extractAmount('data-testid="patientamount-container[^"]*"[^>]*>\\s*([^<]+)'),
      remainder: extractAmount('data-testid="adjustmentsamount-container[^"]*"[^>]*>\\s*([^<]+)'),
      payerName
    }
    
    entries.push(entry)
  }
  
  return entries
}

const buildServiceCode = (code: string, modifiers?: string[]) =>
  code + (modifiers?.filter(m => m?.trim()).map(m => m.trim().startsWith('-') ? m.trim() : `-${m.trim()}`).join('') || '')

const getServiceRate = (s: StatementService) => s.InsuranceRate || s.PatientRate || s.AmountToClaimToInsurance || 0

// Helper to find ERA entry for a service code
const findERA = (eraData: ERAEntry[], serviceCode: string) => 
  eraData?.find(e => e.serviceCode === serviceCode)

// Calculate totals including all services (main + add-ons)
const calculateTotals = (items: ReportItem[]) => {
  let totalRate = 0, totalInsurancePaid = 0, totalClientAmount = 0, totalRemainder = 0
  
  for (const item of items) {
    // Main service
    const mainERA = findERA(item.eraData, item.serviceCodes[0])
    totalRate += mainERA ? mainERA.chargedAmount : item.rate
    totalInsurancePaid += mainERA?.insurancePaid || 0
    totalClientAmount += mainERA?.patientResponsibility || 0
    totalRemainder += mainERA?.remainder || 0
    
    // Add-on services
    for (const addOn of item.addOnServices || []) {
      const addOnERA = findERA(item.eraData, addOn.serviceCodes[0])
      totalRate += addOnERA ? addOnERA.chargedAmount : addOn.rate
      totalInsurancePaid += addOnERA?.insurancePaid || 0
      totalClientAmount += addOnERA?.patientResponsibility || 0
      totalRemainder += addOnERA?.remainder || 0
    }
  }
  
  return {
    totalSessions: items.length,
    totalRate,
    totalInsurancePaid,
    totalClientAmount,
    totalRemainder,
    matched: items.filter(item => item.eraData?.length > 0).length
  }
}

const STATEMENT_FILTER = {
  ClosedItems: true, ItemsWithDirectPaymentCompleted: true, InsurancePaymentStatusesToHide: null,
  PaymentsWithBalancesAssigned: true, InNetworkEdiInsuranceItems: true, InNetworkExternalInsuranceItems: true,
  InNetworkPaperInsuranceItems: true, OutOfNetworkEdiInsuranceItems: true, OutOfNetworkExternalInsuranceItems: true,
  OutOfNetworkPaperInsuranceItems: true, DirectPaymentItems: true, Payments: false, DirectPayments: false,
  InNetworkInsurancePayments: false, OutOfNetworkInsurancePayments: false, IgnoredItems: true,
  ItemsWithIncompleteNotes: true, ItemsWithCompleteNotes: true, AutomaticModifiers: true, PlaceOfServiceCodes: true,
  BillingStatementItemType: null, FilterDateRangeType: 10, ClinicianToShow: null, ClinicianTypeToShow: null,
  PatientsToShow: null, LocationToShow: null, LocationTypeToShow: null, PrimaryInsurancePayerToShow: null,
  SecondaryInsurancePayerToShow: null, InsurancePayersToShow: null, PrimaryInsuranceProviderToShow: null,
  SecondaryInsuranceProviderToShow: null, InsuranceProvidersToShow: null, ServiceCodeToShow: null,
  BillableItemsToShow: null, BillableServicesToShow: null, BillableItemsToExclude: null, BillableServicesToExclude: null,
  PaymentToExcludeFromBalances: null, SinglePayerOnly: false, ShowItemsWithSecondaryInsurancePoliciesOnly: false,
  FilterItemsByPrimaryInsurancePoliciesOnly: false, TransactionSearch: null, Paging: true, PageSize: 100,
  SortDirection: 'asc', SortParameter: 0, ShowWriteOffStatementOnly: null, ShowAutoPayOnly: false
}

interface ReportRow {
  therapist_id: string
  date: string
  time: string | null
  patient_name: string
  service_code: string
  payer: string
  rate: number
  insurance_paid: number | null
  client_amount: number | null
  remainder: number | null
  is_addon: boolean
  session_order: number
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const refresh = new URL(request.url).searchParams.get('refresh') === 'true'
    
    if (!refresh) {
      // Load all rows from database (paginate past 1000 limit)
      const year = new Date().getFullYear()
      const dbRows: ReportRow[] = []
      let from = 0
      
      while (true) {
        const { data, error } = await supabase
          .from('report')
          .select('*')
          .eq('therapist_id', user.id)
          .gte('date', `${year}-01-01`)
          .lte('date', `${year}-12-31`)
          .order('date', { ascending: true })
          .order('session_order', { ascending: true })
          .order('is_addon', { ascending: true })
          .range(from, from + 999)
        
        if (error) {
          console.error('[Report] DB error:', error)
          return NextResponse.json({ error: 'Failed to load report' }, { status: 500 })
        }
        if (!data?.length) break
        dbRows.push(...data)
        if (data.length < 1000) break
        from += 1000
      }

      if (dbRows.length === 0) {
        return NextResponse.json({ items: [], totals: { totalSessions: 0, totalRate: 0, totalInsurancePaid: 0, totalClientAmount: 0, totalRemainder: 0, matched: 0 } })
      }

      // Transform database rows back to report format
      const itemsMap = new Map<string, ReportItem>()
      
      for (const row of dbRows) {
        const key = `${row.date}|${row.patient_name}|${row.session_order}`
        // Parse date as UTC to avoid timezone offset issues
        const [year, month, day] = row.date.split('-').map(Number)
        const dateFormatted = `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}`
        
        if (!row.is_addon) {
          const baseCode = row.service_code.split('-')[0]
          const era: ERAEntry | undefined = row.insurance_paid !== null ? {
            serviceDate: dateFormatted,
            clientName: row.patient_name,
            serviceCode: baseCode,
            chargedAmount: row.rate,
            insurancePaid: row.insurance_paid,
            patientResponsibility: row.client_amount || 0,
            payerName: row.payer,
            remainder: row.remainder || 0
          } : undefined
          itemsMap.set(key, {
            date: dateFormatted,
            time: row.time ? formatTime(row.time) : undefined,
            patientName: row.patient_name,
            serviceCode: row.service_code,
            serviceCodes: [baseCode],
            payer: row.payer,
            rate: row.rate,
            addOnServices: [],
            eraData: era ? [era] : []
          })
        } else {
          const existing = itemsMap.get(key)
          if (existing) {
            const baseCode = row.service_code.replace(/^\+ /, '').split('-')[0]
            const addOnERA: ERAEntry | undefined = row.insurance_paid !== null ? {
              serviceDate: dateFormatted,
              clientName: row.patient_name,
              serviceCode: baseCode,
              chargedAmount: row.rate,
              insurancePaid: row.insurance_paid,
              patientResponsibility: row.client_amount || 0,
              payerName: row.payer,
              remainder: row.remainder || 0
            } : undefined
            existing.addOnServices!.push({
              serviceCode: row.service_code,
              serviceCodes: [baseCode],
              rate: row.rate
            })
            // Update serviceCodes array to include this add-on
            if (!existing.serviceCodes.includes(baseCode)) {
              existing.serviceCodes.push(baseCode)
            }
            if (addOnERA) {
              existing.eraData = existing.eraData || []
              existing.eraData.push(addOnERA)
            }
          }
        }
      }

      const reportItems = Array.from(itemsMap.values())
      
      // Sort by date and time ascending (oldest first, chronological order)
      reportItems.sort((a, b) => {
        const dateA = new Date(normalizeDate(a.date)).getTime()
        const dateB = new Date(normalizeDate(b.date)).getTime()
        if (dateA !== dateB) return dateA - dateB
        
        // If same date, sort by time (oldest time first)
        if (a.time && b.time) {
          const rawA = getRawTime(a.time)
          const rawB = getRawTime(b.time)
          if (!rawA || !rawB) return 0
          const [hA, mA] = rawA.split(':').map(Number)
          const [hB, mB] = rawB.split(':').map(Number)
          return (hA * 60 + mA) - (hB * 60 + mB)
        }
        return 0
      })
      
      const totals = calculateTotals(reportItems)
      
      console.log('[Report] TOTALS FROM DATABASE:')
      console.log(`  DB rows: ${dbRows.length}`)
      console.log(`  Sessions: ${totals.totalSessions}`)
      console.log(`  Matched: ${totals.matched}`)
      console.log(`  Rate: $${totals.totalRate.toFixed(2)}`)
      console.log(`  Insurance Paid: $${totals.totalInsurancePaid.toFixed(2)}`)
      console.log(`  Client Amount: $${totals.totalClientAmount.toFixed(2)}`)
      console.log(`  Remainder: $${totals.totalRemainder.toFixed(2)}`)
      
      // Check for unusual rates (more than $200 for a single session)
      const highRateItems = reportItems.filter(item => {
        const era = findERA(item.eraData, item.serviceCodes[0])
        const rate = era ? era.chargedAmount : item.rate
        return rate > 200
      })
      if (highRateItems.length > 0) {
        console.log(`[Report] Sessions with rate > $200: ${highRateItems.length}`)
        console.log('[Report] Samples:', highRateItems.slice(0, 5).map(i => {
          const era = findERA(i.eraData, i.serviceCodes[0])
          return `${i.date} | ${i.patientName} | $${era ? era.chargedAmount : i.rate}`
        }))
      }
      
      // Log first 5 and last 5 sessions for comparison with refresh
      console.log('[Report] DB First 5 sessions (by date asc):')
      reportItems.slice(0, 5).forEach((item, i) => {
        const era = findERA(item.eraData, item.serviceCodes[0])
        console.log(`  ${i}: ${item.date} | ${item.patientName} | ${item.serviceCode} | rate=$${era ? era.chargedAmount : item.rate} | ERAs=${item.eraData?.length || 0}`)
      })
      console.log('[Report] DB Last 5 sessions:')
      reportItems.slice(-5).forEach((item, i) => {
        const era = findERA(item.eraData, item.serviceCodes[0])
        console.log(`  ${reportItems.length - 5 + i}: ${item.date} | ${item.patientName} | ${item.serviceCode} | rate=$${era ? era.chargedAmount : item.rate} | ERAs=${item.eraData?.length || 0}`)
      })

      return NextResponse.json({ items: reportItems, totals })
    }

    const { data: therapist } = await supabase
      .from('therapists')
      .select('therapynotes_username, therapynotes_password, therapynotes_practice_code')
      .eq('id', user.id)
      .single()

    if (!therapist?.therapynotes_username || !therapist?.therapynotes_password || !therapist?.therapynotes_practice_code) {
      return NextResponse.json({ error: 'TherapyNotes credentials not configured' }, { status: 400 })
    }

    const { accessToken, sessionId } = await loginToTherapyNotes(
      therapist.therapynotes_username,
      therapist.therapynotes_password,
      therapist.therapynotes_practice_code
    )

    const cookies = `${BASE_COOKIES}; access-token=${accessToken}; ASP.NET_SessionId=${sessionId}; practicecode=${therapist.therapynotes_practice_code}`

    const year = new Date().getFullYear()
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)
    const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`

    const sessions: StatementItem[] = []
    let page = 1

    console.log('[Report] Fetching statements from TherapyNotes...')
    while (true) {
      const response = await fetch('https://www.therapynotes.com/app/billing/statements/loadstatement.aspx?msg=1', {
        method: 'POST',
        headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/billing/', 'Cookie': cookies },
        body: new URLSearchParams({
          msg: '1',
          visibleitems: JSON.stringify({ ...STATEMENT_FILTER, MinimumDate: `1/1/${year}`, MaximumDate: `12/31/${year}`, FilterMaximumDate: `12/31/${year}`, Page: page }),
          getbalances: 'false',
          correlationid: crypto.randomUUID(),
          tnrac: TN_RAC
        }).toString()
      })

      if (!response.ok) throw new Error(`Failed to fetch statements: ${response.statusText}`)

      const text = await response.text()
      let data: StatementResponse
      try {
        data = JSON.parse(text)
      } catch {
        const jsonMatch = text.match(/\{[\s\S]*"Items"[\s\S]*\}/)
        if (!jsonMatch) throw new Error('Failed to parse response')
        data = JSON.parse(jsonMatch[0])
      }

      if (!data.Items?.length) break
      sessions.push(...data.Items)
      console.log(`[Report] Page ${page}/${data.TotalPages || 1}: Got ${data.Items.length} items (total: ${sessions.length})`)
      
      const totalPages = data.TotalPages || 1
      if (page >= totalPages) break
      page++
    }
    console.log(`[Report] Total raw sessions from API: ${sessions.length}`)

    console.log('[Report] Fetching ERAs...')
    const eras = await fetchERAs(cookies, formatDate(startDate), formatDate(endDate))
    console.log(`[Report] Found ${eras.length} ERA files`)
    
    const eraEntries: ERAEntry[] = []
    for (const era of eras) {
      try {
        const entries = await fetchERADetails(era.ID, cookies)
        eraEntries.push(...entries)
      } catch (err) {
        console.error(`[Report] Failed ERA ${era.ID}:`, err)
      }
    }
    console.log(`[Report] Total ERA entries: ${eraEntries.length}`)

    const reportItems: ReportItem[] = []
    const timeRawMap = new Map<number, string>() // Track raw time for each item index
    const matchedERAs = new Set<number>()
    
    // Track duplicates for logging
    const sessionKeys = new Map<string, number>()
    let skippedNoServices = 0
    let skippedNoCode = 0
    
    for (const item of sessions.filter(item => item.RecordType === 1)) {
      const services = item.Services || []
      if (!services.length) {
        skippedNoServices++
        continue
      }
      
      const patientName = formatName(`${item.PatientFirstName || ''} ${item.PatientLastName || ''}`.trim())
      // Parse ISO date string directly to avoid timezone issues
      const [datePart, timePart] = (item.Date || '').split('T')
      const [y, m, d] = (datePart || '').split('-')
      const date = y && m && d ? `${m.padStart(2, '0')}/${d.padStart(2, '0')}/${y}` : ''
      const [hr, min] = (timePart?.split(':') || [])
      const timeRaw = hr && min ? `${hr.padStart(2, '0')}:${min.padStart(2, '0')}` : ''
      const time = timeRaw ? formatTime(timeRaw) : ''
      const payer = item.InsurancePayerName || (item.PaymentMethod === 5 ? 'Direct' : 'Unknown')
      
      const mainService = services[0]
      const mainServiceCode = mainService?.ServiceCodeText?.trim() || ''
      if (!mainServiceCode) {
        skippedNoCode++
        continue
      }
      
      // Track duplicates for logging
      const dupKey = `${date}|${patientName}|${mainServiceCode}`
      sessionKeys.set(dupKey, (sessionKeys.get(dupKey) || 0) + 1)
      
      const mainModifiers = mainService.ProcedureModifierCodes?.filter(m => m?.trim()) || []
      const fullServiceCode = buildServiceCode(mainServiceCode, mainModifiers)
      const rate = getServiceRate(mainService)
      const allServiceCodes = [mainServiceCode]
      
      const addOnServices: ReportItem['addOnServices'] = []
      for (const addOnService of services.slice(1)) {
        const addOnCode = addOnService?.ServiceCodeText?.trim() || ''
        if (!addOnCode) continue
        
        allServiceCodes.push(addOnCode)
        addOnServices.push({
          serviceCode: buildServiceCode(addOnCode, addOnService.ProcedureModifierCodes?.filter(m => m?.trim())),
          serviceCodes: [addOnCode],
          rate: getServiceRate(addOnService)
        })
      }
      
      const sessionDate = normalizeDate(date)
      const matchedERAsForSession: ERAEntry[] = []
      
      // Match ERA entries for each service code in this session
      // We need to match one ERA entry per service code (main + add-ons)
      for (const serviceCode of allServiceCodes) {
        for (let i = 0; i < eraEntries.length; i++) {
          if (matchedERAs.has(i)) continue
          
          const era = eraEntries[i]
          const matches = normalizeDate(era.serviceDate) === sessionDate &&
            normalizeName(patientName) === normalizeName(era.clientName) &&
            era.serviceCode === serviceCode
          
          if (matches) {
            matchedERAsForSession.push(era)
            matchedERAs.add(i)
            break // Found the ERA for this service code, move to next service code
          }
        }
      }
      
      const itemIndex = reportItems.length
      if (timeRaw) timeRawMap.set(itemIndex, timeRaw)
      reportItems.push({
        date,
        time,
        patientName,
        serviceCode: fullServiceCode,
        serviceCodes: allServiceCodes,
        payer,
        rate,
        addOnServices,
        eraData: matchedERAsForSession
      })
    }
    
    // Log duplicates (sessions that appear more than once for same date/patient/code)
    const duplicates = Array.from(sessionKeys.entries()).filter(([, count]) => count > 1)
    console.log(`[Report] Sessions with RecordType=1: ${sessions.filter(s => s.RecordType === 1).length}`)
    console.log(`[Report] Skipped (no services): ${skippedNoServices}, (no code): ${skippedNoCode}`)
    console.log(`[Report] Final reportItems: ${reportItems.length}`)
    console.log(`[Report] Duplicate session keys (same date/name/code): ${duplicates.length}`)
    if (duplicates.length > 0) {
      console.log('[Report] Sample duplicates:', duplicates.slice(0, 10).map(([key, count]) => `${key} (x${count})`))
    }

    // Sort by date and time ascending (oldest first, chronological order)
    reportItems.sort((a, b) => {
      const dateA = new Date(normalizeDate(a.date)).getTime()
      const dateB = new Date(normalizeDate(b.date)).getTime()
      if (dateA !== dateB) return dateA - dateB
      
      // If same date, sort by time (oldest time first)
      if (a.time && b.time) {
        const rawA = getRawTime(a.time)
        const rawB = getRawTime(b.time)
        if (!rawA || !rawB) return 0
        const [hA, mA] = rawA.split(':').map(Number)
        const [hB, mB] = rawB.split(':').map(Number)
        return (hA * 60 + mA) - (hB * 60 + mB)
      }
      return 0
    })

    const totals = calculateTotals(reportItems)
    
    console.log('[Report] TOTALS FROM THERAPYNOTES:')
    console.log(`  Sessions: ${totals.totalSessions}`)
    console.log(`  Matched: ${totals.matched}`)
    console.log(`  Rate: $${totals.totalRate.toFixed(2)}`)
    console.log(`  Insurance Paid: $${totals.totalInsurancePaid.toFixed(2)}`)
    console.log(`  Client Amount: $${totals.totalClientAmount.toFixed(2)}`)
    console.log(`  Remainder: $${totals.totalRemainder.toFixed(2)}`)
    
    // Log first 5 and last 5 sessions for verification
    console.log('[Report] First 5 sessions:')
    reportItems.slice(0, 5).forEach((item, i) => {
      const era = findERA(item.eraData, item.serviceCodes[0])
      console.log(`  ${i}: ${item.date} | ${item.patientName} | ${item.serviceCode} | rate=$${era ? era.chargedAmount : item.rate} | ERAs=${item.eraData?.length || 0}`)
    })
    console.log('[Report] Last 5 sessions:')
    reportItems.slice(-5).forEach((item, i) => {
      const era = findERA(item.eraData, item.serviceCodes[0])
      console.log(`  ${reportItems.length - 5 + i}: ${item.date} | ${item.patientName} | ${item.serviceCode} | rate=$${era ? era.chargedAmount : item.rate} | ERAs=${item.eraData?.length || 0}`)
    })

    // Save to database
    const parseDate = (dateStr: string) => {
      const [month, day, year] = dateStr.split('/')
      return year && month && day ? `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}` : null
    }

    const rowsToInsert: Array<{
      therapist_id: string
      date: string
      time: string | null
      patient_name: string
      service_code: string
      payer: string
      rate: number
      insurance_paid: number | null
      client_amount: number | null
      remainder: number | null
      is_addon: boolean
      session_order: number
    }> = []
    const sessionOrderMap = new Map<string, number>()
    
    reportItems.forEach((item, index) => {
      const dateNormalized = parseDate(item.date)
      if (!dateNormalized) return

      const orderKey = `${dateNormalized}|${item.patientName}`
      const sessionOrder = sessionOrderMap.get(orderKey) || 0
      sessionOrderMap.set(orderKey, sessionOrder + 1)

      const mainERA = findERA(item.eraData, item.serviceCodes[0])
      const timeRaw = timeRawMap.get(index) || null
      
      rowsToInsert.push({
        therapist_id: user.id,
        date: dateNormalized,
        time: timeRaw,
        patient_name: item.patientName,
        service_code: item.serviceCode,
        payer: mainERA?.payerName || item.payer,
        rate: mainERA ? mainERA.chargedAmount : item.rate,
        insurance_paid: mainERA?.insurancePaid ?? null,
        client_amount: mainERA?.patientResponsibility ?? null,
        remainder: mainERA?.remainder ?? null,
        is_addon: false,
        session_order: sessionOrder
      })
      
      for (const addOn of item.addOnServices || []) {
        const addOnERA = findERA(item.eraData, addOn.serviceCodes[0])
        rowsToInsert.push({
          therapist_id: user.id,
          date: dateNormalized,
          time: timeRaw,
          patient_name: item.patientName,
          service_code: addOn.serviceCode,
          payer: addOnERA?.payerName || item.payer,
          rate: addOnERA ? addOnERA.chargedAmount : addOn.rate,
          insurance_paid: addOnERA?.insurancePaid ?? null,
          client_amount: addOnERA?.patientResponsibility ?? null,
          remainder: addOnERA?.remainder ?? null,
          is_addon: true,
          session_order: sessionOrder
        })
      }
    })
    
    console.log(`[Report] Rows to insert: ${rowsToInsert.length} (main sessions: ${reportItems.length})`)

    // Delete old data then insert new data
    const { error: deleteError } = await supabase
      .from('report')
      .delete()
      .eq('therapist_id', user.id)
      .gte('date', `${year}-01-01`)
      .lte('date', `${year}-12-31`)
    
    if (deleteError) {
      console.error('[Report] Failed to delete old data:', deleteError)
    }

    if (rowsToInsert.length > 0) {
      const batchSize = 1000
      for (let i = 0; i < rowsToInsert.length; i += batchSize) {
        const batch = rowsToInsert.slice(i, i + batchSize)
        const { error } = await supabase.from('report').insert(batch)
        if (error) {
          console.error(`[Report] Failed to save batch ${i / batchSize + 1}:`, error)
        }
      }
    }

    return NextResponse.json({ items: reportItems, totals })

  } catch (error) {
    console.error('[Report] Error:', error)
    return NextResponse.json({
      error: 'Failed to fetch report',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
