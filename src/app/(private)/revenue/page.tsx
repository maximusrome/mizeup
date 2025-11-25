'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { DollarSign } from 'lucide-react'
import type { ProgressNote } from '@/types'

// Add-on code pricing
const ADD_ON_PRICING: Record<string, number> = {
  '90785': 12.96, // Interactive Complexity
  '99050': 16.58, // After Hours
  '90840': 63.21  // Crisis Psychotherapy Extended
}

interface RevenueData {
  totalRevenueEarned: number
  monthlyRevenueEarned: number
  weeklyRevenueEarned: number
  dailyRevenue: { date: string; revenue: number }[]
  weeklyRevenue: { week: string; revenue: number }[]
  monthlyRevenue: { month: string; revenue: number }[]
  codeUsageCounts: {
    '90837': number  // Psychotherapy 60 minutes
    '90839': number  // Crisis Psychotherapy
    '90785': number  // Interactive Complexity
    '99050': number  // After Hours
    '90840': number  // Crisis Psychotherapy Extended
  }
}

// Note shape returned by /api/revenue with joined session
type SessionLite = { id: string; date: string }
type ProgressNoteWithSession = ProgressNote & { sessions?: SessionLite | SessionLite[] }

// Chart component with period selection and optional cumulative overlay
function RevenueChart({ 
  data, 
  period,
  showCumulative 
}: { 
  data: { date?: string; week?: string; month?: string; revenue: number }[]
  period: 'daily' | 'weekly' | 'monthly'
  showCumulative: boolean
}) {
  if (data.length === 0) return null

  const width = 800
  const height = 320
  const padding = { top: 30, right: 50, bottom: 70, left: 70 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  const maxRevenue = Math.max(...data.map(d => d.revenue))
  
  // Calculate cumulative values if needed
  let cumulativeData: number[] = []
  let maxCumulative = 0
  if (showCumulative) {
    let runningTotal = 0
    cumulativeData = data.map(d => {
      runningTotal += d.revenue
      return runningTotal
    })
    maxCumulative = Math.max(...cumulativeData, maxRevenue)
  }

  // Calculate nice rounded Y-axis max value
  const maxForAxis = showCumulative ? maxCumulative : maxRevenue
  const niceMax = maxForAxis === 0 ? 100 : (() => {
    const magnitude = Math.pow(10, Math.floor(Math.log10(maxForAxis)))
    const normalized = maxForAxis / magnitude
    let niceValue
    if (normalized <= 1) niceValue = 1
    else if (normalized <= 2) niceValue = 2
    else if (normalized <= 5) niceValue = 5
    else niceValue = 10
    return niceValue * magnitude * 1.1 // Add 10% padding
  })()

  // Add a small inner gap so the first column/point doesn't touch the Y-axis
  const innerLeftGap = 16
  const xScale = (index: number) => {
    const span = Math.max(chartWidth - innerLeftGap, 1)
    if (data.length === 1) return padding.left + innerLeftGap + span / 2
    return padding.left + innerLeftGap + (index / (data.length - 1)) * span
  }
  
  // Better bar width calculation with proper spacing
  const availableWidth = chartWidth
  const barSpacing = period === 'monthly' ? 40 : period === 'weekly' ? 25 : 8
  const barWidth = Math.min(
    Math.max((availableWidth - (data.length - 1) * barSpacing) / data.length, 8),
    period === 'monthly' ? 50 : period === 'weekly' ? 40 : 20
  )
  
  const yScale = (value: number) => padding.top + chartHeight - ((value / niceMax) * chartHeight)
  const yScaleCumulative = (value: number) => padding.top + chartHeight - ((value / niceMax) * chartHeight)

  // Generate nice Y-axis labels with even increments
  const yAxisTickCount = 5
  const tickStep = niceMax / (yAxisTickCount - 1)
  const yAxisValues = Array.from({ length: yAxisTickCount }, (_, i) => {
    return Math.round((tickStep * i) * 100) / 100 // Round to 2 decimals
  })

  // X-axis labels (adaptive based on data length)
  const xAxisStep = data.length <= 30 ? 1 : Math.ceil(data.length / 10)

  const formatLabel = (item: typeof data[0]) => {
    if (period === 'daily' && item.date) {
      const date = new Date(item.date)
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
    if (period === 'weekly' && item.week) {
      return item.week
    }
    if (period === 'monthly' && item.month) {
      return item.month
    }
    return ''
  }

  // Build cumulative line path as straight segments between points (no right angles)
  const cumulativePath = showCumulative
    ? cumulativeData.map((value, index) => {
        const x = xScale(index)
        const y = yScaleCumulative(value)
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`
      }).join(' ')
    : ''

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="border-b border-l">
        {/* Y-axis labels */}
        {yAxisValues.map((value, i) => {
          const y = yScale(value)
          return (
            <g key={i}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
              <text
                x={padding.left - 12}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#6b7280"
                fontWeight="500"
              >
                ${value.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {data.map((item, index) => {
          if (index % xAxisStep !== 0 && index !== data.length - 1) return null
          const x = xScale(index)
          const label = formatLabel(item)
          
          // For monthly/weekly with fewer items, show all labels
          const shouldShow = data.length <= 12 || index % xAxisStep === 0 || index === data.length - 1
          if (!shouldShow) return null
          
          return (
            <g key={index}>
              <line
                x1={x}
                y1={padding.top + chartHeight}
                x2={x}
                y2={padding.top + chartHeight + 4}
                stroke="#9ca3af"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padding.top + chartHeight + (data.length > 12 ? 25 : 20)}
                textAnchor="middle"
                fontSize="12"
                fill="#4b5563"
                fontWeight="500"
                transform={data.length > 12 ? `rotate(-45, ${x}, ${padding.top + chartHeight + (data.length > 12 ? 25 : 20)})` : ''}
              >
                {label}
              </text>
            </g>
          )
        })}

        {/* Bars (period revenue) */}
        {!showCumulative && data.map((item, index) => {
          const centerX = xScale(index)
          const x = centerX - barWidth / 2
          const y = yScale(item.revenue)
          const barHeight = padding.top + chartHeight - y
          
          if (barHeight <= 0) return null
          
          return (
            <g key={index}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill="#3b82f6"
                rx="3"
                opacity={0.9}
              />
              {/* Value label on top of bar if there's space */}
              {barHeight > 20 && (
                <text
                  x={centerX}
                  y={y - 5}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#1e40af"
                  fontWeight="600"
                >
                  ${item.revenue.toFixed(0)}
                </text>
              )}
            </g>
          )
        })}

        {/* Cumulative line */}
        {showCumulative && (
          <>
            <path
              d={cumulativePath}
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2"
            />
            {cumulativeData.map((value, index) => {
              const x = xScale(index)
              const y = yScaleCumulative(value)
              // For daily totals we show every day as a point; for weekly/monthly we thin the points
              const showPoint = period === 'daily' 
                ? true 
                : (index % Math.ceil(data.length / 15) === 0 || index === 0 || index === data.length - 1)
              if (!showPoint) return null
              
              // Only show label if there was revenue in this period (value increased from previous)
              const previousValue = index > 0 ? cumulativeData[index - 1] : 0
              const hasIncrease = value > previousValue
              
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r={period === 'daily' ? 3 : 4}
                    fill="#3b82f6"
                    stroke="#ffffff"
                    strokeWidth="2"
                  />
                  {hasIncrease && (
                    <text
                      x={x}
                      y={y - 8}
                      textAnchor="middle"
                      fontSize="11"
                      fill="#1e40af"
                      fontWeight="600"
                    >
                      ${value.toFixed(0)}
                    </text>
                  )}
                </g>
              )
            })}
          </>
        )}
      </svg>
    </div>
  )
}

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily')
  const [showCumulative, setShowCumulative] = useState(false)

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        const response = await fetch('/api/revenue')
        const result = await response.json()
        
        if (!response.ok) {
          throw new Error(result.error || 'Failed to fetch revenue data')
        }

        const notes: ProgressNoteWithSession[] = result.data || []
        
        // Only count synced notes
        const syncedNotes = notes.filter(n => n.synced_to_therapynotes)
        
        // Calculate total revenue and build daily map
        let totalRevenueEarned = 0
        const dailyRevenueMap = new Map<string, number>()
        const codeUsageCounts = { '90837': 0, '90839': 0, '90785': 0, '99050': 0, '90840': 0 }
        
        syncedNotes.forEach((note) => {
          // Handle both array and object format from Supabase join
          const joined = note.sessions
          const session: SessionLite | undefined = Array.isArray(joined) ? joined[0] : joined
          if (!session?.date) {
            return
          }
          
          const billingCodes = note.content?.billingCodes || []
          
          // Check if this is a crisis session (90839) or regular session (90837)
          const isCrisis = billingCodes.some(bc => bc.code === '90839')
          if (isCrisis) {
            codeUsageCounts['90839']++
          } else {
            // Count regular session code (every synced note has this)
            codeUsageCounts['90837']++
          }
          
          let noteRevenue = 0
          
          billingCodes.forEach(bc => {
            if (bc.code === '90785') {
              noteRevenue += ADD_ON_PRICING['90785']
              codeUsageCounts['90785']++
            } else if (bc.code === '99050') {
              noteRevenue += ADD_ON_PRICING['99050']
              codeUsageCounts['99050']++
            } else if (bc.code === '90840') {
              noteRevenue += ADD_ON_PRICING['90840']
              codeUsageCounts['90840']++
            }
          })
          
          if (noteRevenue > 0) {
            totalRevenueEarned += noteRevenue
            const current = dailyRevenueMap.get(session.date) || 0
            dailyRevenueMap.set(session.date, current + noteRevenue)
          }
        })
        
        // Build daily revenue array (sorted by date)
        const dailyRevenueUnsorted = Array.from(dailyRevenueMap.entries())
          .map(([date, revenue]) => ({ date, revenue }))
          .sort((a, b) => a.date.localeCompare(b.date))
        
        // Fill in missing days from first revenue date to today
        if (dailyRevenueUnsorted.length > 0) {
          const firstDate = new Date(dailyRevenueUnsorted[0].date)
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const allDays: { date: string; revenue: number }[] = []
          
          // Create a map for quick lookup
          const revenueMap = new Map(dailyRevenueUnsorted.map(d => [d.date, d.revenue]))
          
          // Generate all dates from first revenue date to today
          const currentDate = new Date(firstDate)
          while (currentDate <= today) {
            const dateStr = currentDate.toISOString().split('T')[0]
            allDays.push({
              date: dateStr,
              revenue: revenueMap.get(dateStr) || 0
            })
            currentDate.setDate(currentDate.getDate() + 1)
          }
          
          const dailyRevenue = allDays
          
          // Calculate monthly revenue (current month)
          const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
          const monthlyRevenueEarned = dailyRevenue
            .filter(d => {
              const date = new Date(d.date)
              return date >= currentMonthStart && date <= today
            })
            .reduce((sum, d) => sum + d.revenue, 0)
          
          // Calculate weekly revenue (current week, Monday to Sunday)
          const currentWeekStart = new Date(today)
          const dayOfWeek = today.getDay()
          const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
          currentWeekStart.setDate(today.getDate() - daysToMonday)
          currentWeekStart.setHours(0, 0, 0, 0)
          
          const weeklyRevenueEarned = dailyRevenue
            .filter(d => {
              const date = new Date(d.date)
              return date >= currentWeekStart && date <= today
            })
            .reduce((sum, d) => sum + d.revenue, 0)
          
          // Aggregate weekly revenue
          const weeklyMap = new Map<string, number>()
          const weeklyLabels = new Map<string, string>()
          dailyRevenue.forEach(d => {
            const date = new Date(d.date)
            const weekStart = new Date(date)
            const dayOfWeek = date.getDay()
            const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
            weekStart.setDate(date.getDate() - daysToMonday)
            weekStart.setHours(0, 0, 0, 0)
            
            const weekKey = weekStart.toISOString().split('T')[0]
            const weekLabel = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
            
            const current = weeklyMap.get(weekKey) || 0
            weeklyMap.set(weekKey, current + d.revenue)
            
            if (!weeklyLabels.has(weekKey)) {
              weeklyLabels.set(weekKey, weekLabel)
            }
          })
          
          const weeklyRevenue = Array.from(weeklyMap.entries())
            .map(([weekKey, revenue]) => ({
              week: weeklyLabels.get(weekKey) || weekKey,
              revenue,
              date: weekKey // for sorting
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
          
          // Aggregate monthly revenue
          const monthlyMap = new Map<string, number>()
          const monthlyLabels = new Map<string, string>()
          dailyRevenue.forEach(d => {
            const date = new Date(d.date)
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
            const monthLabel = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
            
            const current = monthlyMap.get(monthKey) || 0
            monthlyMap.set(monthKey, current + d.revenue)
            
            if (!monthlyLabels.has(monthKey)) {
              monthlyLabels.set(monthKey, monthLabel)
            }
          })
          
          const monthlyRevenue = Array.from(monthlyMap.entries())
            .map(([monthKey, revenue]) => ({
              month: monthlyLabels.get(monthKey) || monthKey,
              revenue,
              date: `${monthKey}-01` // for sorting
            }))
            .sort((a, b) => a.date.localeCompare(b.date))
          
          setData({
            totalRevenueEarned,
            monthlyRevenueEarned,
            weeklyRevenueEarned,
            dailyRevenue,
            weeklyRevenue,
            monthlyRevenue,
            codeUsageCounts
          })
        } else {
          setData({
            totalRevenueEarned,
            monthlyRevenueEarned: 0,
            weeklyRevenueEarned: 0,
            dailyRevenue: [],
            weeklyRevenue: [],
            monthlyRevenue: [],
            codeUsageCounts: { '90837': syncedNotes.length, '90839': 0, '90785': 0, '99050': 0, '90840': 0 }
          })
        }
      } catch (error) {
        console.error('Failed to fetch revenue data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchRevenueData()
  }, [])

  if (loading) {
    return (
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Revenue</h1>
          </div>
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </div>
    )
  }

  const revenueData: RevenueData = {
    totalRevenueEarned: data?.totalRevenueEarned ?? 0,
    monthlyRevenueEarned: data?.monthlyRevenueEarned ?? 0,
    weeklyRevenueEarned: data?.weeklyRevenueEarned ?? 0,
    dailyRevenue: data?.dailyRevenue ?? [],
    weeklyRevenue: data?.weeklyRevenue ?? [],
    monthlyRevenue: data?.monthlyRevenue ?? [],
    codeUsageCounts: data?.codeUsageCounts ?? { '90837': 0, '90839': 0, '90785': 0, '99050': 0, '90840': 0 }
  }

  const getPeriodData = () => {
    if (selectedPeriod === 'daily') {
      return revenueData.dailyRevenue.map(d => ({ date: d.date, revenue: d.revenue }))
    }
    if (selectedPeriod === 'weekly') {
      return revenueData.weeklyRevenue.map(w => ({ week: w.week, revenue: w.revenue }))
    }
    return revenueData.monthlyRevenue.map(m => ({ month: m.month, revenue: m.revenue }))
  }

  return (
    <div className="container mx-auto px-4 max-w-6xl">
      <div className="py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">Additional Revenue</h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Additional revenue from add‑on codes, beyond your standard TherapyNotes payments.
          </p>
        </div>
        
        <div className="space-y-6">
          {/* Revenue Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Total Additional Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">+${revenueData.totalRevenueEarned.toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Monthly Additional Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">+${revenueData.monthlyRevenueEarned.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground mt-1">This month</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Weekly Additional Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">+${revenueData.weeklyRevenueEarned.toFixed(2)}</div>
                <div className="text-sm text-muted-foreground mt-1">This week</div>
              </CardContent>
            </Card>
          </div>

          {/* Code Usage */}
          {(revenueData.codeUsageCounts['90837'] > 0 || revenueData.codeUsageCounts['90839'] > 0) && (
            <Card>
              <CardHeader>
                <CardTitle>Code Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Psychotherapy 60 minutes (90837)
                    </div>
                    <div className="text-3xl font-bold">{revenueData.codeUsageCounts['90837']}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Crisis Psychotherapy (90839)
                    </div>
                    <div className="text-3xl font-bold">{revenueData.codeUsageCounts['90839']}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Interactive Complexity (+90785)
                    </div>
                    <div className="text-3xl font-bold">{revenueData.codeUsageCounts['90785']}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      After Hours (+99050)
                    </div>
                    <div className="text-3xl font-bold">{revenueData.codeUsageCounts['99050']}</div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <div className="text-sm font-medium text-muted-foreground mb-1">
                      Crisis Extended (+90840)
                    </div>
                    <div className="text-3xl font-bold">{revenueData.codeUsageCounts['90840']}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Combined Revenue Chart */}
          {getPeriodData().length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Additional Revenue Over Time</CardTitle>
                  <Tabs value={showCumulative ? 'total' : 'period'} onValueChange={(v) => setShowCumulative(v === 'total')}>
                    <TabsList>
                      <TabsTrigger value="period">Period</TabsTrigger>
                      <TabsTrigger value="total">Total</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'daily' | 'weekly' | 'monthly')}>
                  <TabsList>
                    <TabsTrigger value="daily">Daily</TabsTrigger>
                    <TabsTrigger value="weekly">Weekly</TabsTrigger>
                    <TabsTrigger value="monthly">Monthly</TabsTrigger>
                  </TabsList>
                  <TabsContent value={selectedPeriod} className="mt-4">
                    <RevenueChart 
                      data={getPeriodData()} 
                      period={selectedPeriod}
                      showCumulative={showCumulative}
                    />
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {revenueData.dailyRevenue.length === 0 && revenueData.totalRevenueEarned === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <p>No additional revenue data available yet.</p>
                <p className="text-sm mt-2">Sync notes with add-on codes to track additional revenue beyond standard payments.</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
