import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

const SQUARE = 'https://connect.squareup.com/v2'
const TN = 'https://www.therapynotes.com/app'
const TN_HEADERS = { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Origin': 'https://www.therapynotes.com' }
const TN_RAC = 'BfcAAAAAAAD2ZJ40MeN_Gk1SkcfxW0mJoaa6g0Dn4n6NQfPwUKKXEw'
const COOKIES = 'timezone-offset=-240; cookie-detection=1'

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, supabase: null }
  return { error: null, user, supabase }
}

function getCookies(h: Headers) {
  return Array.from(h.entries()).filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => v.split(';')[0])
}

async function loginTN(u: string, p: string, pc: string) {
  const s1 = await fetch(`${TN}/session/processlogin.aspx?msg=3`, {
    method: 'POST', headers: { ...TN_HEADERS, 'Referer': `${TN}/login/`, 'Cookie': COOKIES },
    body: new URLSearchParams({ practicecode: pc, docookiecheck: 'true', correlationid: crypto.randomUUID() }).toString(),
    redirect: 'manual'
  })
  const s2 = await fetch(`${TN}/session/processlogin.aspx?msg=4`, {
    method: 'POST', headers: { ...TN_HEADERS, 'Referer': `${TN}/login/`, 'Cookie': `${COOKIES}; ${getCookies(s1.headers).join('; ')}` },
    body: new URLSearchParams({
      msg: '4', password: createHash('sha512').update(p).digest('hex').toUpperCase(),
      agreetos: 'false', docookiecheck: 'true', username: u,
      'e-username': Buffer.from(pc).toString('base64'), twofactorreentryskipfornow: 'false', correlationid: crypto.randomUUID()
    }).toString(), redirect: 'manual'
  })
  const c = getCookies(s2.headers)
  return { accessToken: c.find(x => x.includes('access-token='))?.split('=')[1], sessionId: c.find(x => x.includes('ASP.NET_SessionId='))?.split('=')[1] }
}

async function fetchTNPatients(cookies: string) {
  const patients: Array<{ ID: number; FirstName: string; LastName: string }> = []
  let page = 1, pageCount = 1
  do {
    const res = await fetch(`${TN}/patients/loadpatientlist.aspx?msg=1`, {
      method: 'POST', headers: { ...TN_HEADERS, 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest', 'Referer': `${TN}/patients/` },
      body: new URLSearchParams({ msg: '1', manual: 'false', page: page.toString(), sortparameter: 'name', sortascending: 'true', patient: '', assignment: 'any', status: 'any', correlationid: crypto.randomUUID(), tnrac: TN_RAC }).toString()
    })
    const d = await res.json() as { Matches?: Array<{ ID: number; FirstName: string; LastName: string }>; PageCount?: number }
    patients.push(...(d.Matches || []))
    pageCount = d.PageCount || 1
    page++
  } while (page <= pageCount)
  return patients.map((p) => ({ id: p.ID, name: [p.FirstName, p.LastName].filter(Boolean).join(' ') }))
}

function matchPatient(name: string, patients: Array<{ tn_patient_id: number; name: string }>) {
  if (!name || !patients?.length) return null
  const n = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ')
  const last = (s: string) => n(s).split(' ').pop() || ''
  const exact = patients.find(p => n(p.name) === n(name))
  if (exact) return { id: exact.tn_patient_id, name: exact.name }
  const l = last(name)
  if (l.length > 1) {
    const m = patients.find(p => last(p.name) === l)
    if (m) return { id: m.tn_patient_id, name: m.name }
  }
  return null
}

export async function GET(request: Request) {
  try {
    const auth = await getAuth()
    if (auth.error) return auth.error
    const type = new URL(request.url).searchParams.get('type')
    
    if (type === 'tn-patients') {
      const { data: t } = await auth.supabase!.from('therapists').select('therapynotes_username, therapynotes_password, therapynotes_practice_code').eq('id', auth.user!.id).single()
      if (!t?.therapynotes_username || !t?.therapynotes_password || !t?.therapynotes_practice_code) return NextResponse.json({ error: 'TherapyNotes credentials not configured' }, { status: 400 })
      const { accessToken, sessionId } = await loginTN(t.therapynotes_username, t.therapynotes_password, t.therapynotes_practice_code)
      if (!accessToken) return NextResponse.json({ error: 'Failed to login' }, { status: 400 })
      const patients = await fetchTNPatients(`${COOKIES}; access-token=${accessToken}; ASP.NET_SessionId=${sessionId}`)
      if (patients.length > 0) {
        await auth.supabase!.from('therapynotes_patients').delete().eq('therapist_id', auth.user!.id)
        const { error } = await auth.supabase!.from('therapynotes_patients').insert(patients.map(p => ({ therapist_id: auth.user!.id, tn_patient_id: p.id, name: p.name })))
        if (error) return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
      }
      return NextResponse.json({ patients })
    }

    if (type === 'transactions') {
      const { data: t } = await auth.supabase!.from('therapists').select('square_access_token').eq('id', auth.user!.id).single()
      if (!t?.square_access_token) return NextResponse.json({ error: 'Square credentials not configured' }, { status: 400 })
      const now = new Date(), yearStart = new Date(now.getFullYear(), 0, 1)
      const payments: Array<{ id: string; customer_id?: string; buyer_email_address?: string; amount_money?: { amount?: number }; status?: string; created_at?: string }> = []
      let cursor: string | null = null
      do {
        const params = new URLSearchParams({ begin_time: yearStart.toISOString(), end_time: now.toISOString(), limit: '100' })
        if (cursor) params.set('cursor', cursor)
        const res = await fetch(`${SQUARE}/payments?${params.toString()}`, { headers: { 'Square-Version': '2024-01-18', 'Authorization': `Bearer ${t.square_access_token}`, 'Content-Type': 'application/json' } })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { errors?: Array<{ detail?: string }> }
          return NextResponse.json({ error: err.errors?.[0]?.detail || 'Failed to fetch' }, { status: res.status })
        }
        const d = await res.json() as { payments?: Array<{ id: string; customer_id?: string; buyer_email_address?: string; amount_money?: { amount?: number }; status?: string; created_at?: string }>; cursor?: string }
        payments.push(...(d.payments || []))
        cursor = d.cursor || null
      } while (cursor)

      const { data: tnPatients } = await auth.supabase!.from('therapynotes_patients').select('tn_patient_id, name').eq('therapist_id', auth.user!.id)
      const transactions = await Promise.all(payments.map(async (p) => {
        let name = null, email = null
        if (p.customer_id) {
          try {
            const res = await fetch(`${SQUARE}/customers/${p.customer_id}`, { headers: { 'Square-Version': '2024-01-18', 'Authorization': `Bearer ${t.square_access_token}`, 'Content-Type': 'application/json' } })
            if (res.ok) {
              const { customer } = await res.json() as { customer?: { given_name?: string; family_name?: string; email_address?: string } }
              if (customer) { name = [customer.given_name, customer.family_name].filter(Boolean).join(' ') || null; email = customer.email_address || null }
            }
          } catch {}
        }
        const matched = matchPatient(name || p.buyer_email_address || '', tnPatients || [])
        return { id: p.id, amount_money: p.amount_money, status: p.status, created_at: p.created_at, customer_name: name, buyer_email: email || p.buyer_email_address, tn_patient_id: matched?.id || null, tn_patient_name: matched?.name || null }
      }))
      return NextResponse.json({ transactions, count: transactions.length })
    }

    const { data: t } = await auth.supabase!.from('therapists').select('square_access_token').eq('id', auth.user!.id).single()
    return NextResponse.json({ accessToken: t?.square_access_token || '' })
  } catch {
    return NextResponse.json({ error: 'Request failed' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuth()
    if (auth.error) return auth.error
    const { accessToken } = await request.json()
    const { error } = await auth.supabase!.from('therapists').update({ square_access_token: accessToken || null }).eq('id', auth.user!.id)
    if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
