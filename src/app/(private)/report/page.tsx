'use client'

import { useState, Fragment, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, AlertCircle, Calendar } from 'lucide-react'

interface ScheduleSession {
  date: string
  startDateTime: string
  clientName: string
}

interface BillingData {
  serviceDate: string
  clientName: string
  serviceCode: string
  chargedAmount: number
  insurancePaid: number
  patientResponsibility: number
  payerName: string
}

interface CombinedRow {
  schedule: ScheduleSession | null
  billing: BillingData[]
  hasSchedule: boolean
  hasBilling: boolean
  isDirectPay?: boolean
  noteStatus?: 'Note Synced' | 'Needs Note'
}

interface ReportData {
  rows: CombinedRow[]
  totals: {
    totalCharged: number
    totalInsurancePaid: number
    totalPatientResponsibility: number
    totalScheduledSessions: number
    totalBilledServices: number
  }
}

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async (refresh = false) => {
    setLoading(true)
    setError(null)

    try {
      const url = refresh ? '/api/therapynotes/report?refresh=true' : '/api/therapynotes/report'
      const response = await fetch(url)
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.message || result.error || 'Failed to fetch report')
      }

      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }

  // Load data on mount
  useEffect(() => {
    fetchReport(false)
  }, [])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              Session Billing Report
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Schedule sessions matched with ERA billing data (last 90 days)
            </p>
          </div>
          <Button 
            onClick={() => fetchReport(true)} 
            disabled={loading}
            variant="ghost"
            size="icon"
            title="Refresh Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="h-5 w-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!data && !loading && !error && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Click &quot;Refresh Data&quot; to load your schedule and billing data from TherapyNotes.</p>
            </CardContent>
          </Card>
        )}

        {loading && (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 animate-spin" />
              <p>Loading schedule and billing data from TherapyNotes...</p>
              <p className="text-sm mt-2">This may take a moment.</p>
            </CardContent>
          </Card>
        )}

        {data && !loading && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Scheduled Sessions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totals.totalScheduledSessions}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Billed Services</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.totals.totalBilledServices}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Total Charged</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(data.totals.totalCharged)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Insurance Paid</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{formatCurrency(data.totals.totalInsurancePaid)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Patient Resp.</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-info">{formatCurrency(data.totals.totalPatientResponsibility)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Combined Table */}
            <Card>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-4 font-medium">Date</th>
                        <th className="text-left py-2 px-4 font-medium">Client</th>
                        <th className="text-left py-2 px-4 font-medium">Code</th>
                        <th className="text-left py-2 px-4 font-medium">Payer</th>
                        <th className="text-right py-2 px-4 font-medium">Charged</th>
                        <th className="text-right py-2 px-4 font-medium">Ins. Paid</th>
                        <th className="text-right py-2 px-4 font-medium">Patient</th>
                        <th className="text-left py-2 px-4 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.rows.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-muted-foreground">
                            No sessions found.
                          </td>
                        </tr>
                      ) : (
                        data.rows.map((row, index) => {
                          const billingCount = row.billing.length
                          const rowSpan = Math.max(1, billingCount)
                          
                          return (
                            <Fragment key={`row-${index}`}>
                              {/* First row with schedule data */}
                              <tr
                                className={`border-b hover:bg-muted/30 ${
                                  !row.hasSchedule ? 'bg-muted/20' : 
                                  !row.hasBilling ? 'bg-warning-light/20' : ''
                                }`}
                              >
                                {/* Schedule columns - rowSpan for multiple billing lines */}
                                <td className="py-3 px-4 text-sm" rowSpan={rowSpan}>
                                  {row.schedule ? (
                                    <div className="font-medium">{row.schedule.date}</div>
                                  ) : row.billing[0] ? (
                                    <div className="font-medium">{row.billing[0].serviceDate}</div>
                                  ) : (
                                    <span className="text-muted-foreground italic">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-sm" rowSpan={rowSpan}>
                                  {row.schedule ? row.schedule.clientName : (
                                    row.billing[0] ? row.billing[0].clientName : (
                                      <span className="text-muted-foreground italic">—</span>
                                    )
                                  )}
                                </td>
                                
                                {/* First billing row or empty */}
                                {row.billing[0] ? (
                                  <>
                                    <td className="py-3 px-4 text-sm">{row.billing[0].serviceCode}</td>
                                    <td className="py-3 px-4 text-sm text-muted-foreground max-w-[150px] truncate" title={row.billing[0].payerName}>
                                      {row.billing[0].payerName}
                                    </td>
                                    <td className="py-3 px-4 text-right text-sm">{formatCurrency(row.billing[0].chargedAmount)}</td>
                                    <td className="py-3 px-4 text-right text-sm text-success">{formatCurrency(row.billing[0].insurancePaid)}</td>
                                    <td className="py-3 px-4 text-right text-sm text-info">{formatCurrency(row.billing[0].patientResponsibility)}</td>
                                    <td className="py-3 px-4" rowSpan={rowSpan}>
                                      {row.noteStatus === 'Note Synced' ? (
                                        <span className="text-success text-xs">Note Synced</span>
                                      ) : (
                                        <span className="text-destructive text-xs">Needs Note</span>
                                      )}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-3 px-4 text-sm text-muted-foreground italic">—</td>
                                    <td className="py-3 px-4 text-sm text-muted-foreground">
                                      {row.isDirectPay ? (
                                        <span>Direct</span>
                                      ) : (
                                        <span className="italic">—</span>
                                      )}
                                    </td>
                                    <td className="py-3 px-4 text-right text-muted-foreground italic">—</td>
                                    <td className="py-3 px-4 text-right text-muted-foreground italic">—</td>
                                    <td className="py-3 px-4 text-right text-muted-foreground italic">—</td>
                                    <td className="py-3 px-4" rowSpan={rowSpan}>
                                      {row.noteStatus === 'Note Synced' ? (
                                        <span className="text-success text-xs">Note Synced</span>
                                      ) : row.noteStatus ? (
                                        <span className="text-destructive text-xs">Needs Note</span>
                                      ) : (
                                        <span className="text-muted-foreground italic">—</span>
                                      )}
                                    </td>
                                  </>
                                )}
                              </tr>
                              
                              {/* Additional billing rows (e.g., 90785 add-on codes) */}
                              {row.billing.slice(1).map((billing, billingIdx) => (
                                <tr 
                                  key={`row-${index}-${billingIdx + 1}`} 
                                  className="border-b hover:bg-muted/30"
                                >
                                  <td className="py-2 px-4 text-sm text-muted-foreground">
                                    + {billing.serviceCode}
                                  </td>
                                  <td className="py-2 px-4 text-sm text-muted-foreground max-w-[150px] truncate" title={billing.payerName}>
                                    {billing.payerName}
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm">{formatCurrency(billing.chargedAmount)}</td>
                                  <td className="py-2 px-4 text-right text-sm text-success">{formatCurrency(billing.insurancePaid)}</td>
                                  <td className="py-2 px-4 text-right text-sm text-info">{formatCurrency(billing.patientResponsibility)}</td>
                                  <td className="py-2 px-4"></td>
                                </tr>
                              ))}
                            </Fragment>
                          )
                        })
                      )}
                    </tbody>
                    {data.rows.length > 0 && (
                      <tfoot>
                        <tr className="bg-muted/50 font-medium">
                          <td className="py-3 px-4" colSpan={2}>
                            {data.totals.totalScheduledSessions} sessions / {data.totals.totalBilledServices} services
                          </td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 text-right text-sm">{formatCurrency(data.totals.totalCharged)}</td>
                          <td className="py-3 px-4 text-right text-sm text-success">{formatCurrency(data.totals.totalInsurancePaid)}</td>
                          <td className="py-3 px-4 text-right text-sm text-info">{formatCurrency(data.totals.totalPatientResponsibility)}</td>
                          <td className="py-3 px-4"></td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
