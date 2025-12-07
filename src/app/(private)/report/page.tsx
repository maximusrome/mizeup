'use client'

import { useState, Fragment } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCw, DollarSign, AlertCircle, Calendar, CheckCircle2 } from 'lucide-react'

interface ScheduleSession {
  date: string
  time: string
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
}

interface ReportData {
  rows: CombinedRow[]
  totals: {
    totalCharged: number
    totalInsurancePaid: number
    totalPatientResponsibility: number
    totalScheduledSessions: number
    totalBilledServices: number
    matchedSessions: number
    unmatchedSchedule: number
    unmatchedBilling: number
  }
}

export default function ReportPage() {
  const [data, setData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async () => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/therapynotes/report')
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
            onClick={fetchReport} 
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Loading...' : 'Refresh Data'}
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
                  <div className="text-2xl font-bold text-green-600">{formatCurrency(data.totals.totalInsurancePaid)}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">Patient Resp.</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{formatCurrency(data.totals.totalPatientResponsibility)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Match Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="py-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle2 className="h-5 w-5" />
                    <span className="text-lg font-semibold">{data.totals.matchedSessions}</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">Matched Sessions</p>
                </CardContent>
              </Card>
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="py-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-orange-700">
                    <Calendar className="h-5 w-5" />
                    <span className="text-lg font-semibold">{data.totals.unmatchedSchedule}</span>
                  </div>
                  <p className="text-sm text-orange-600 mt-1">Schedule Only (No Billing)</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="py-4 text-center">
                  <div className="flex items-center justify-center gap-2 text-purple-700">
                    <DollarSign className="h-5 w-5" />
                    <span className="text-lg font-semibold">{data.totals.unmatchedBilling}</span>
                  </div>
                  <p className="text-sm text-purple-600 mt-1">Billing Only (No Schedule)</p>
                </CardContent>
              </Card>
            </div>

            {/* Combined Table */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Session Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th colSpan={3} className="text-left py-2 px-4 font-semibold text-muted-foreground border-r">
                          Schedule (TherapyNotes Calendar)
                        </th>
                        <th colSpan={5} className="text-left py-2 px-4 font-semibold text-muted-foreground">
                          Billing (ERA Data)
                        </th>
                      </tr>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left py-2 px-4 font-medium">Date</th>
                        <th className="text-left py-2 px-4 font-medium">Time</th>
                        <th className="text-left py-2 px-4 font-medium border-r">Client</th>
                        <th className="text-left py-2 px-4 font-medium">Code</th>
                        <th className="text-right py-2 px-4 font-medium">Charged</th>
                        <th className="text-right py-2 px-4 font-medium">Ins. Paid</th>
                        <th className="text-right py-2 px-4 font-medium">Patient</th>
                        <th className="text-left py-2 px-4 font-medium">Payer</th>
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
                                  !row.hasSchedule ? 'bg-purple-50/50' : 
                                  !row.hasBilling ? 'bg-orange-50/50' : ''
                                }`}
                              >
                                {/* Schedule columns - rowSpan for multiple billing lines */}
                                <td className="py-3 px-4" rowSpan={rowSpan}>
                                  {row.schedule ? (
                                    <div className="font-medium">{row.schedule.date}</div>
                                  ) : row.billing[0] ? (
                                    <div className="font-medium">{row.billing[0].serviceDate}</div>
                                  ) : (
                                    <span className="text-muted-foreground italic">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4" rowSpan={rowSpan}>
                                  {row.schedule ? (
                                    <div className="text-sm font-medium text-blue-600">{row.schedule.time}</div>
                                  ) : (
                                    <span className="text-muted-foreground italic text-xs">—</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 border-r" rowSpan={rowSpan}>
                                  {row.schedule ? row.schedule.clientName : (
                                    row.billing[0] ? row.billing[0].clientName : (
                                      <span className="text-muted-foreground italic">—</span>
                                    )
                                  )}
                                </td>
                                
                                {/* First billing row or empty */}
                                {row.billing[0] ? (
                                  <>
                                    <td className="py-3 px-4">{row.billing[0].serviceCode}</td>
                                    <td className="py-3 px-4 text-right">{formatCurrency(row.billing[0].chargedAmount)}</td>
                                    <td className="py-3 px-4 text-right text-green-600">{formatCurrency(row.billing[0].insurancePaid)}</td>
                                    <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(row.billing[0].patientResponsibility)}</td>
                                    <td className="py-3 px-4 text-xs text-muted-foreground max-w-[150px] truncate" title={row.billing[0].payerName}>
                                      {row.billing[0].payerName}
                                    </td>
                                  </>
                                ) : (
                                  <>
                                    <td className="py-3 px-4 text-muted-foreground italic">—</td>
                                    <td className="py-3 px-4 text-right text-muted-foreground italic">—</td>
                                    <td className="py-3 px-4 text-right text-muted-foreground italic">—</td>
                                    <td className="py-3 px-4 text-right text-muted-foreground italic">—</td>
                                    <td className="py-3 px-4 text-muted-foreground">
                                      {row.isDirectPay ? (
                                        <span className="text-blue-600 font-medium">Direct</span>
                                      ) : (
                                        <span className="italic">—</span>
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
                                  <td className="py-2 px-4 text-xs text-muted-foreground">
                                    + {billing.serviceCode}
                                  </td>
                                  <td className="py-2 px-4 text-right text-sm">{formatCurrency(billing.chargedAmount)}</td>
                                  <td className="py-2 px-4 text-right text-sm text-green-600">{formatCurrency(billing.insurancePaid)}</td>
                                  <td className="py-2 px-4 text-right text-sm text-blue-600">{formatCurrency(billing.patientResponsibility)}</td>
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
                          <td className="py-3 px-4 border-r" colSpan={3}>
                            {data.totals.totalScheduledSessions} sessions / {data.totals.totalBilledServices} services
                          </td>
                          <td className="py-3 px-4"></td>
                          <td className="py-3 px-4 text-right">{formatCurrency(data.totals.totalCharged)}</td>
                          <td className="py-3 px-4 text-right text-green-600">{formatCurrency(data.totals.totalInsurancePaid)}</td>
                          <td className="py-3 px-4 text-right text-blue-600">{formatCurrency(data.totals.totalPatientResponsibility)}</td>
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
