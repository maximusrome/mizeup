'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Eye, EyeOff, Check, Loader2 } from 'lucide-react'

type Transaction = {
  id: string
  amount: number
  date_created: string
  note: string
  other_party_name: string
  tn_patient_name?: string | null
}

export default function VenmoForm() {
  const [accessToken, setAccessToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[] | null>(null)

  useEffect(() => {
    fetch('/api/venmo').then(r => r.ok ? r.json() : null).then(d => setAccessToken(d?.accessToken || '')).finally(() => setLoading(false))
  }, [])

  const handle = async (action: 'save' | 'test') => {
    if (action === 'save') setSaving(true)
    if (action === 'test') { setTesting(true); setTransactions(null) }
    setMessage(null)

    try {
      const res = await fetch(action === 'test' ? '/api/venmo?type=transactions' : '/api/venmo', {
        method: action === 'save' ? 'PUT' : 'GET',
        headers: action === 'save' ? { 'Content-Type': 'application/json' } : undefined,
        body: action === 'save' ? JSON.stringify({ accessToken }) : undefined
      })
      const data = await res.json()

      if (res.ok) {
        if (action === 'test') {
          setMessage({ type: 'success', text: `Found ${data.transactions?.length || 0} transactions` })
          setTransactions(data.transactions || [])
        } else {
          setMessage({ type: 'success', text: 'Credentials saved' })
        }
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
      setTesting(false)
    }
  }

  if (loading) return <Card><CardHeader><CardTitle>Venmo Integration</CardTitle></CardHeader><CardContent><p className="text-sm text-muted-foreground">Loading...</p></CardContent></Card>

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Venmo Integration
          {accessToken && <span className="ml-auto flex items-center gap-1 text-sm font-normal text-green-600"><Check className="h-4 w-4" /> Connected</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="venmo-access-token">Access Token</Label>
          <div className="relative">
            <Input id="venmo-access-token" type={showToken ? 'text' : 'password'} placeholder="Your Venmo access token" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className="pr-10" />
            <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">Extract from your Venmo browser session (check Network tab in DevTools)</p>
        </div>

        {message && <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-50 text-green-900 border border-green-200' : 'bg-red-50 text-red-900 border border-red-200'}`}>{message.text}</div>}

        <div className="flex gap-2">
          <Button onClick={() => handle('save')} disabled={saving} className="flex-1">{saving ? 'Saving...' : 'Save Credentials'}</Button>
          <Button onClick={() => handle('test')} disabled={testing} variant="outline" className="flex-1">
            {testing ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Testing...</> : 'Test Connection'}
          </Button>
        </div>

        {transactions && transactions.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Client Payment Totals:</h3>
              <div className="border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="text-left py-2 px-4 font-medium">Client</th>
                      <th className="text-right py-2 px-4 font-medium">Total Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(
                      transactions.reduce((acc, tx) => {
                        const clientName = tx.tn_patient_name || tx.other_party_name || 'Unknown'
                        acc[clientName] = (acc[clientName] || 0) + tx.amount
                        return acc
                      }, {} as Record<string, number>)
                    )
                      .sort(([, a], [, b]) => b - a)
                      .map(([clientName, total]) => (
                        <tr key={clientName} className="border-b hover:bg-muted/30">
                          <td className="py-2 px-4">{clientName}</td>
                          <td className="py-2 px-4 text-right font-semibold text-green-600">
                            ${total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="font-semibold text-sm">Recent Transactions:</h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {transactions.map((tx) => (
                  <div key={tx.id} className="p-3 border rounded text-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{tx.other_party_name || 'Unknown'}</p>
                        {tx.tn_patient_name && <p className="text-xs text-blue-600 font-medium">→ {tx.tn_patient_name}</p>}
                        {tx.note && <p className="text-xs text-muted-foreground italic">{tx.note}</p>}
                        <p className="text-xs text-muted-foreground">{tx.date_created ? new Date(tx.date_created).toLocaleString() : 'Unknown date'}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">+${tx.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">received</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
