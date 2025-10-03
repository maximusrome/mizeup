'use client'

import { useState, useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'

  const sessionSchema = z.object({
    clientName: z.string().min(1, 'Client name is required').max(100, 'Client name is too long'),
    startTime: z.string().min(1, 'Start time is required'),
    endTime: z.string().min(1, 'End time is required'),
    date: z.string().min(1, 'Date is required'),
  })

type SessionFormData = z.infer<typeof sessionSchema>

interface Session {
  id: string
  clientName: string
  startTime: string
  endTime: string
  date: string
}

interface DaySessions {
  [date: string]: Session[]
}

export default function CalendarPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<DaySessions>({})
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)

  // Swipe gesture handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null)
    setTouchStart(e.targetTouches[0].clientX)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX)
  }

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return
    
    const distance = touchStart - touchEnd
    const isLeftSwipe = distance > 50
    const isRightSwipe = distance < -50

    if (isLeftSwipe) {
      // Swipe left - go to next week
      setCurrentWeekOffset(prev => prev + 1)
    }
    if (isRightSwipe) {
      // Swipe right - go to previous week
      setCurrentWeekOffset(prev => prev - 1)
    }
  }

  // Get current time rounded to nearest 15 minutes
  const getCurrentTimeRounded = () => {
    const now = new Date()
    const minutes = now.getMinutes()
    const roundedMinutes = Math.round(minutes / 15) * 15
    const roundedTime = new Date(now)
    roundedTime.setMinutes(roundedMinutes, 0, 0)
    return roundedTime.toTimeString().slice(0, 5)
  }

  // Helper function to add 1 hour to a time string
  const addOneHour = (timeString: string) => {
    if (!timeString) return ''
    try {
      const [hours, minutes] = timeString.split(':').map(Number)
      let newHours = hours + 1
      if (newHours >= 24) newHours = newHours % 24
      return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
    } catch {
      return ''
    }
  }


  // Local date helpers to avoid UTC shifting issues
  const getLocalDateString = (date: Date) => {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const parseLocalDateString = (dateString: string) => {
    const [y, m, d] = dateString.split('-').map(Number)
    return new Date(y, (m || 1) - 1, d || 1)
  }

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      clientName: '',
      startTime: '',
      endTime: '',
      date: '',
    },
  })


  // Get fixed week dates (Sun–Sat) based on current offset
  const getWeekDates = () => {
    const today = new Date()
    const todayLocal = getLocalDateString(today)
    const startOfWeek = new Date(today)
    const dayOfWeek = today.getDay() // 0=Sun
    // start at the beginning of this week
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    // apply week offset (swipe/buttons)
    startOfWeek.setDate(startOfWeek.getDate() + (currentWeekOffset * 7))

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      weekDates.push({
        date: getLocalDateString(date),
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        isCurrentMonth: date.getMonth() === today.getMonth(),
        isToday: getLocalDateString(date) === todayLocal
      })
    }
    return weekDates
  }

  const weekDates = getWeekDates()

  // Auto-scroll to today's card on initial load
  const calendarRef = useRef<HTMLDivElement | null>(null)
  const scrollToToday = () => {
    const container = calendarRef.current
    if (!container) return
    const todayEl = container.querySelector('[data-today="true"]') as HTMLElement | null
    if (todayEl) {
      todayEl.scrollIntoView({ block: 'start', behavior: 'smooth' })
    }
  }

  useEffect(() => {
    scrollToToday()
  }, [])

  const formatDate = (dateString: string) => {
    const date = parseLocalDateString(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
    })
  }


  const handleDayClick = (date: string) => {
    setSelectedDate(date)
    setIsModalOpen(true)
    setEditingSession(null)
    
    // Set smart defaults
    const currentTime = getCurrentTimeRounded()
    const endTime = addOneHour(currentTime)
    
    form.reset({
      clientName: '',
      startTime: currentTime,
      endTime: endTime,
      date: date,
    })
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setSelectedDate(session.date)
    setIsModalOpen(true)
    
    form.reset({
      clientName: session.clientName,
      startTime: session.startTime,
      endTime: session.endTime,
      date: session.date,
    })
  }

  const onSubmit = (data: SessionFormData) => {
    if (editingSession) {
      // Update existing session
      const updatedSession: Session = {
        ...editingSession,
        clientName: data.clientName.trim(),
        startTime: data.startTime.trim(),
        endTime: data.endTime.trim(),
        date: data.date
      }

      setSessions(prev => {
        const newSessions = { ...prev }
        
        // Remove from old date
        newSessions[editingSession.date] = newSessions[editingSession.date]?.filter(s => s.id !== editingSession.id) || []
        
        // Add to new date
        newSessions[data.date] = [...(newSessions[data.date] || []), updatedSession]
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
        
        return newSessions
      })
    } else {
      // Create new session
      const session: Session = {
        id: Date.now().toString(),
        clientName: data.clientName.trim(),
        startTime: data.startTime.trim(),
        endTime: data.endTime.trim(),
        date: data.date
      }

      setSessions(prev => ({
        ...prev,
        [data.date]: [...(prev[data.date] || []), session].sort((a, b) => a.startTime.localeCompare(b.startTime))
      }))
    }

    setIsModalOpen(false)
    setEditingSession(null)
    form.reset()
  }

  const handleDeleteSession = (sessionId: string, date: string) => {
    setSessions(prev => ({
      ...prev,
      [date]: prev[date]?.filter(session => session.id !== sessionId) || []
    }))
  }

  const getSessionsForDate = (date: string) => {
    return sessions[date] || []
  }

  // Format time for display
  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return ''
    try {
      // Handle both HH:MM format and ensure proper display
      const [hours, minutes] = timeString.split(':').map(Number)
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return timeString
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pt-16 lg:pt-0 lg:pl-64">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="py-6">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground mb-2">Calendar</h1>
            </div>

                    {/* Weekly Calendar with Swipe Navigation */}
                    {/* Week Navigation */}
                    <div className="flex items-center justify-between mb-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                        className="h-8 w-8 p-0"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                      </Button>
                      
                      <span className="text-sm font-medium text-foreground">
                        {(() => {
                          const today = new Date()
                          const startOfWeek = new Date(today)
                          const dayOfWeek = today.getDay()
                          startOfWeek.setDate(today.getDate() - dayOfWeek + (currentWeekOffset * 7))
                          const endOfWeek = new Date(startOfWeek)
                          endOfWeek.setDate(startOfWeek.getDate() + 6)
                          
                          const startMonth = startOfWeek.toLocaleDateString('en-US', { month: 'short' })
                          const startDay = startOfWeek.getDate()
                          const endMonth = endOfWeek.toLocaleDateString('en-US', { month: 'short' })
                          const endDay = endOfWeek.getDate()
                          
                          if (startMonth === endMonth) {
                            return `${startMonth} ${startDay}-${endDay}`
                          } else {
                            return `${startMonth} ${startDay} - ${endMonth} ${endDay}`
                          }
                        })()}
                      </span>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                        className="h-8 w-8 p-0"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Button>
                    </div>

                    <div 
                      className="space-y-3 pb-6"
                      ref={calendarRef}
                      onTouchStart={handleTouchStart}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                    >
                      {/* Week Days */}
                      {weekDates.map((dayData) => {
                        const daySessions = getSessionsForDate(dayData.date)
                        const formattedDate = formatDate(dayData.date)
                        
                        return (
                          <Card 
                            key={dayData.date} 
                            className={`px-4 pt-4 pb-3 cursor-pointer hover:bg-muted/30 transition-colors ${
                              dayData.isToday ? 'ring-1 ring-primary/30' : ''
                            } ${!dayData.isCurrentMonth ? 'opacity-50' : ''}`}
                            data-today={dayData.isToday ? 'true' : undefined}
                          >
                            <div className="mb-2">
                              <div className="flex items-center justify-between">
                                <h3 className={`font-semibold text-lg ${dayData.isToday ? 'text-primary' : ''}`}>
                                  {dayData.dayName} <span className="text-sm text-muted-foreground font-normal">{formattedDate}</span>
                                </h3>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Add session"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDayClick(dayData.date)
                                  }}
                                  className="h-8 w-8 p-0"
                                >
                                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                  </svg>
                                </Button>
                              </div>
                            </div>

                            {/* Sessions for this day */}
                            {daySessions.length > 0 && (
                              <div className="mt-2 space-y-2">
                                {daySessions.map((session) => (
                                <div 
                                  key={session.id}
                                  className="flex justify-between items-center p-3 bg-muted/50 rounded-md border hover:bg-muted/70"
                                  onClick={() => handleEditSession(session)}
                                >
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-sm text-foreground">
                                        {formatTimeForDisplay(session.startTime)}
                                      </span>
                                      <span className="text-sm truncate">{session.clientName}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          router.push('/private/notes')
                                        }}
                                        className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8 p-0"
                                      >
                                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                      </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        handleDeleteSession(session.id, dayData.date)
                                      }}
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                                    >
                                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                      </svg>
                                    </Button>
                                  </div>
                                </div>
                                ))}
                              </div>
                            )}
                          </Card>
                        )
                      })}
            </div>
          </div>
        </div>
      </div>

      {/* Add Session Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50"
          onClick={() => setIsModalOpen(false)}
        >
          <Card 
            className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{editingSession ? 'Edit Session' : 'Add Session'}</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsModalOpen(false)}
                  className="text-muted-foreground hover:text-foreground h-10 w-10 p-0 rounded-full text-lg"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                 <FormField
                   control={form.control}
                   name="clientName"
                   render={({ field }) => (
                     <FormItem>
                       <FormLabel>Client Name</FormLabel>
                       <FormControl>
                         <Input placeholder="Enter client name" {...field} autoFocus />
                       </FormControl>
                       <FormMessage />
                     </FormItem>
                   )}
                 />
                 {editingSession ? (
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ) : (
                  // Keep the date value in form state without showing a picker
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <input type="hidden" {...field} value={field.value || selectedDate} />
                    )}
                  />
                )}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            step="900"
                            onChange={(e) => {
                              const startTime = e.target.value
                              field.onChange(startTime)
                              form.setValue('endTime', addOneHour(startTime))
                            }}
                            className="text-center"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl>
                          <Input
                            type="time"
                            {...field}
                            step="900"
                            className="text-center"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                  <div className="pt-2">
                    <Button type="submit" className="w-full" size="lg">
                      {editingSession ? 'Update' : 'Add'}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
