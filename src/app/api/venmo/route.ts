import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const VENMO_API = 'https://api.venmo.com/v1'
const PAYER_MAP: Record<string, string> = { 'kimberly napier': 'jenna fitzpatrick' }

type VenmoTransaction = {
  id: string
  type: string
  date_created?: string
  payment?: {
    id: string
    amount: number
    action: string
    date_created?: string
    note?: string
    actor?: { id?: string; display_name?: string; first_name?: string; last_name?: string; username?: string }
    target?: { user?: { id?: string; display_name?: string; first_name?: string; last_name?: string; username?: string } }
  }
  note?: string
}

type Transaction = {
  id: string
  amount: number
  date_created: string
  note: string
  other_party_name: string
  tn_patient_id: number | null
  tn_patient_name: string | null
}

async function getAuth() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }), user: null, supabase: null }
  return { error: null, user, supabase }
}

function matchPatient(name: string, patients: Array<{ tn_patient_id: number; name: string }>): { id: number; name: string } | null {
  if (!name || !patients?.length) return null
  const n = name.toLowerCase().trim()
  const mapped = PAYER_MAP[n]
  if (mapped) {
    const found = patients.find(p => p.name.toLowerCase() === mapped)
    if (found) return { id: found.tn_patient_id, name: found.name }
  }
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, ' ').replace(/'/g, '')
  const last = (s: string) => normalize(s).split(' ').pop() || ''
  const exact = patients.find(p => normalize(p.name) === normalize(name))
  if (exact) return { id: exact.tn_patient_id, name: exact.name }
  const l = last(name)
  const lastMatch = l.length > 1 ? patients.find(p => last(p.name) === l) : null
  return lastMatch ? { id: lastMatch.tn_patient_id, name: lastMatch.name } : null
}

export async function GET(request: Request) {
  try {
    const auth = await getAuth()
    if (auth.error) return auth.error
    const type = new URL(request.url).searchParams.get('type')

    if (type === 'transactions') {
      const { data: t } = await auth.supabase!.from('therapists').select('venmo_access_token').eq('id', auth.user!.id).single()
      if (!t?.venmo_access_token) return NextResponse.json({ error: 'Venmo credentials not configured' }, { status: 400 })
      const headers = {
        'Authorization': `Bearer ${t.venmo_access_token}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
      }

      const identityRes = await fetch(`${VENMO_API}/account`, { headers })
      if (!identityRes.ok) {
        const err = await identityRes.json().catch(() => ({})) as { error?: { message?: string } }
        return NextResponse.json({ error: err.error?.message || 'Failed to authenticate' }, { status: identityRes.status })
      }

      const identityData = await identityRes.json() as { data?: { user?: { id?: string } } }
      const userId = identityData.data?.user?.id
      if (!userId) return NextResponse.json({ error: 'Failed to get user ID' }, { status: 400 })

      const yearStart = new Date(new Date().getFullYear(), 0, 1)
      const allTransactions: VenmoTransaction[] = []
      let nextUrl: string | null = `${VENMO_API}/stories/target-or-actor/${userId}?limit=50`

      while (nextUrl) {
        const res = await fetch(nextUrl, { headers })
        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: { message?: string } }
          return NextResponse.json({ error: err.error?.message || 'Failed to fetch' }, { status: res.status })
        }
        const { data, pagination } = await res.json() as { data?: VenmoTransaction[], pagination?: { next?: string } }
        allTransactions.push(...(data || []))
        const pastYear = (data || []).some((tx: VenmoTransaction) => new Date(tx.date_created || tx.payment?.date_created || '') < yearStart)
        nextUrl = pastYear || !pagination?.next ? null : pagination.next
      }

      const { data: tnPatients } = await auth.supabase!.from('therapynotes_patients').select('tn_patient_id, name').eq('therapist_id', auth.user!.id)

      const transactions: Transaction[] = allTransactions
        .filter((tx: VenmoTransaction) => {
          if (tx.type !== 'payment' || !tx.payment) return false
          const p = tx.payment
          const uid = String(userId)
          const isActor = String(p.actor?.id) === uid
          const isTarget = String(p.target?.user?.id) === uid
          const received = isActor ? p.action !== 'pay' : isTarget ? p.action === 'pay' : false
          return received && new Date(p.date_created || tx.date_created || '') >= yearStart
        })
        .map((tx: VenmoTransaction) => {
          const p = tx.payment!
          const uid = String(userId)
          const otherParty = String(p.actor?.id) === uid ? p.target?.user : String(p.target?.user?.id) === uid ? p.actor : p.target?.user || p.actor
          const name = (otherParty?.display_name || (otherParty?.first_name && otherParty?.last_name ? `${otherParty.first_name} ${otherParty.last_name}` : '') || otherParty?.first_name || otherParty?.last_name || otherParty?.username || 'Unknown').trim()
          const matched = matchPatient(name, tnPatients || [])

          return {
            id: p.id || tx.id,
            amount: p.amount || 0,
            date_created: p.date_created || tx.date_created || '',
            note: p.note || tx.note || '',
            other_party_name: name,
            tn_patient_id: matched?.id || null,
            tn_patient_name: matched?.name || null
          }
        })
        .filter((tx: Transaction) => tx.tn_patient_id !== null)
        .sort((a, b) => new Date(b.date_created).getTime() - new Date(a.date_created).getTime())

      return NextResponse.json({ transactions, count: transactions.length })
    }

    const { data: t } = await auth.supabase!.from('therapists').select('venmo_access_token').eq('id', auth.user!.id).single()
    return NextResponse.json({ accessToken: t?.venmo_access_token || '' })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Request failed' }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const auth = await getAuth()
    if (auth.error) return auth.error
    const { accessToken } = await request.json()
    const { error } = await auth.supabase!.from('therapists').update({ venmo_access_token: accessToken || null }).eq('id', auth.user!.id)
    if (error) return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }
}
