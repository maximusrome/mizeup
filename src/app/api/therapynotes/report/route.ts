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
  let claimIdx = -1
  
  while ((trMatch = trPattern.exec(html))) {
    const [fullRow, content] = trMatch
    const idx = trMatch.index
    
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
    
    const extractAmount = (pattern: string) => Math.abs(parseAmount(content.match(new RegExp(pattern, 'i'))?.[1] || '0'))
    const chargedAmount = parseAmount(content.match(/data-testid="chargedrate-container[^"]*"[^>]*>([^<]+)/i)?.[1] || '0')
    
    const entry = {
      serviceDate: date,
      clientName,
      serviceCode: code,
      chargedAmount,
      insurancePaid: extractAmount('data-testid="paidamount-container[^"]*"[^>]*>([^<]+)'),
      patientResponsibility: extractAmount('data-testid="patientamount-container[^"]*"[^>]*>([^<]+)'),
      remainder: extractAmount('data-testid="adjustmentsamount-container[^"]*"[^>]*>([^<]+)'),
      payerName
    }
    
    entries.push(entry)
  }
  
  return entries
}

const buildServiceCode = (code: string, modifiers?: string[]) =>
  code + (modifiers?.filter(m => m?.trim()).map(m => m.trim().startsWith('-') ? m.trim() : `-${m.trim()}`).join('') || '')

const getServiceRate = (s: StatementService) => s.InsuranceRate || s.PatientRate || s.AmountToClaimToInsurance || 0

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

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
    const formatDate = (d: Date) => `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
    const startDate = new Date(year, 0, 1)
    const endDate = new Date(year, 11, 31, 23, 59, 59)

    const sessions: StatementItem[] = []
    let page = 1

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
      
      const totalPages = data.TotalPages || 1
      if (page >= totalPages) break
      page++
    }

    const eras = await fetchERAs(cookies, formatDate(startDate), formatDate(endDate))
    const eraEntries: ERAEntry[] = []
    for (const era of eras) {
      try {
        eraEntries.push(...await fetchERADetails(era.ID, cookies))
      } catch (err) {
        console.error(`[Report] Failed ERA ${era.ID}:`, err)
      }
    }

    const reportItems: ReportItem[] = []
    const matchedERAIds = new Set<string>()
    
    for (const item of sessions.filter(item => item.RecordType === 1)) {
      const services = item.Services || []
      if (!services.length) continue
      
      const patientName = formatName(`${item.PatientFirstName || ''} ${item.PatientLastName || ''}`.trim())
      const date = item.Date ? new Date(item.Date).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) : ''
      const payer = item.InsurancePayerName || (item.PaymentMethod === 5 ? 'Direct' : 'Unknown')
      
      const mainService = services[0]
      const mainServiceCode = mainService?.ServiceCodeText?.trim() || ''
      if (!mainServiceCode) continue
      
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
      const matchedERAs = eraEntries.filter(era => {
        const matches = normalizeDate(era.serviceDate) === sessionDate &&
          normalizeName(patientName) === normalizeName(era.clientName) &&
          allServiceCodes.includes(era.serviceCode)
        if (matches) {
          matchedERAIds.add(`${era.serviceDate}|${era.clientName}|${era.serviceCode}`)
        }
        return matches
      })
      
      reportItems.push({
        date,
        patientName,
        serviceCode: fullServiceCode,
        serviceCodes: allServiceCodes,
        payer,
        rate,
        addOnServices,
        eraData: matchedERAs
      })
    }

    const totals = {
      totalSessions: reportItems.length,
      totalRate: reportItems.reduce((sum, item) => {
        const era = item.eraData?.[0]
        return sum + (era ? era.chargedAmount : item.rate)
      }, 0),
      totalInsurancePaid: eraEntries.reduce((sum, e) => sum + e.insurancePaid, 0),
      totalClientAmount: eraEntries.reduce((sum, e) => sum + e.patientResponsibility, 0),
      totalRemainder: eraEntries.reduce((sum, e) => sum + e.remainder, 0),
      matched: reportItems.filter(item => item.eraData?.length).length
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
