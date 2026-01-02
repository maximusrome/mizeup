'use client'

import { useState, Fragment, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, RefreshCw } from 'lucide-react'

interface AddOnService {
  serviceCode: string
  serviceCodes: string[]
  rate: number
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

interface ReportItem {
  date: string
  time?: string
  patientName: string
  serviceCode: string
  payer: string
  rate: number
  addOnServices?: AddOnService[]
  eraData?: ERAEntry[]
}

interface ReportData {
  items: ReportItem[]
  totals?: {
    totalSessions: number
    totalRate: number
    totalInsurancePaid: number
    totalClientAmount: number
    totalRemainder: number
    matched: number
  }
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

export default function ReportPage() {
  const [reportData, setReportData] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = async (refresh = false) => {
    setLoading(true)
    setError(null)
    try {
      const url = refresh ? '/api/therapynotes/report?refresh=true' : '/api/therapynotes/report'
      const response = await fetch(url)
      const result = await response.json()
      if (!response.ok) throw new Error(result.message || result.error || 'Failed to fetch report')
      setReportData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReport()
  }, [])

  return (
    <div className="container mx-auto px-4 max-w-7xl">
      <div className="py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Report</h1>
            <p className="text-muted-foreground mt-1 text-sm">TherapyNotes billing data for {new Date().getFullYear()}</p>
          </div>
          <Button onClick={() => fetchReport(true)} disabled={loading} variant="outline">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {loading ? 'Refreshing...' : 'Refresh from TherapyNotes'}
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

        {reportData && (
          <Card>
            {reportData.totals && (
              <CardContent className="border-b">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                  <div>
                    <div className="text-muted-foreground">Total Sessions</div>
                    <div className="font-semibold text-lg">{reportData.totals.totalSessions}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">ERAs Matched</div>
                    <div className="font-semibold text-lg">{reportData.totals.matched}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Rate</div>
                    <div className="font-semibold text-lg">{formatCurrency(reportData.totals.totalRate)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Insurance Paid</div>
                    <div className="font-semibold text-lg text-green-600">{formatCurrency(reportData.totals.totalInsurancePaid)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Client Amount</div>
                    <div className="font-semibold text-lg text-blue-600">{formatCurrency(reportData.totals.totalClientAmount)}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Total Remainder</div>
                    <div className="font-semibold text-lg">{formatCurrency(reportData.totals.totalRemainder)}</div>
                  </div>
                </div>
              </CardContent>
            )}
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left py-2 px-4 font-medium border-r-2">Date</th>
                      <th className="text-left py-2 px-4 font-medium border-r-2">Time</th>
                      <th className="text-left py-2 px-4 font-medium border-r-2">Name</th>
                      <th className="text-left py-2 px-4 font-medium border-r-2">Code</th>
                      <th className="text-left py-2 px-4 font-medium border-r-2">Payer</th>
                      <th className="text-right py-2 px-4 font-medium border-r-2">Rate</th>
                      <th className="text-right py-2 px-4 font-medium">Insurance Paid</th>
                      <th className="text-right py-2 px-4 font-medium">Client Amount</th>
                      <th className="text-right py-2 px-4 font-medium">Remainder</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.items.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-muted-foreground">No data found.</td>
                      </tr>
                    ) : (
                      reportData.items.map((item, index) => {
                        const era = item.eraData?.[0]
                        return (
                          <Fragment key={`item-${index}`}>
                            <tr className="border-b hover:bg-muted/30">
                              <td className="py-3 px-4 text-sm border-r-2">{item.date}</td>
                              <td className="py-3 px-4 text-sm border-r-2">{item.time || '—'}</td>
                              <td className="py-3 px-4 text-sm border-r-2">{item.patientName}</td>
                              <td className="py-3 px-4 text-sm border-r-2">{item.serviceCode}</td>
                              <td className="py-3 px-4 text-sm text-muted-foreground max-w-[150px] truncate border-r-2" title={era?.payerName || item.payer}>{era?.payerName || item.payer}</td>
                              <td className="py-3 px-4 text-right text-sm border-r-2">{era ? formatCurrency(era.chargedAmount) : formatCurrency(item.rate)}</td>
                              <td className="py-3 px-4 text-right text-sm text-success">{era ? formatCurrency(era.insurancePaid) : '—'}</td>
                              <td className="py-3 px-4 text-right text-sm text-info">{era ? formatCurrency(era.patientResponsibility) : '—'}</td>
                              <td className="py-3 px-4 text-right text-sm">{era ? formatCurrency(era.remainder) : '—'}</td>
                            </tr>
                            {item.addOnServices?.map((addOn, addOnIdx) => {
                              const addOnERA = item.eraData?.find(e => e.serviceCode === addOn.serviceCodes[0])
                              return (
                                <tr key={`item-${index}-addon-${addOnIdx}`} className="border-b hover:bg-muted/30 bg-muted/10">
                                  <td className="py-2 px-4 text-sm border-r-2"></td>
                                  <td className="py-2 px-4 text-sm border-r-2"></td>
                                  <td className="py-2 px-4 text-sm border-r-2"></td>
                                  <td className="py-2 px-4 text-sm text-muted-foreground border-r-2">+ {addOn.serviceCode}</td>
                                  <td className="py-2 px-4 text-sm border-r-2"></td>
                                  <td className="py-2 px-4 text-right text-sm border-r-2">{addOnERA ? formatCurrency(addOnERA.chargedAmount) : formatCurrency(addOn.rate)}</td>
                                  <td className="py-2 px-4 text-right text-sm text-success">{addOnERA ? formatCurrency(addOnERA.insurancePaid) : '—'}</td>
                                  <td className="py-2 px-4 text-right text-sm text-info">{addOnERA ? formatCurrency(addOnERA.patientResponsibility) : '—'}</td>
                                  <td className="py-2 px-4 text-right text-sm">{addOnERA ? formatCurrency(addOnERA.remainder) : '—'}</td>
                                </tr>
                              )
                            })}
                          </Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
