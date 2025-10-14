'use client'

import { useState, useEffect } from 'react'
import Sidebar from '@/components/Sidebar'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import SessionModal from '@/components/calendar/SessionModal'
import SessionCard from '@/components/calendar/SessionCard'
import { getSessions } from '@/lib/api'
import type { Session } from '@/types'

export default function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [touchStart, setTouchStart] = useState<number | null>(null)
  const [touchEnd, setTouchEnd] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [isSyncingNotes, setIsSyncingNotes] = useState(false)
  const [noteSyncStatus, setNoteSyncStatus] = useState<string | null>(null)

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
      setCurrentWeekOffset(prev => prev + 1)
    }
    if (isRightSwipe) {
      setCurrentWeekOffset(prev => prev - 1)
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
    return new Date(y, m - 1, d)
  }

  // Get week dates starting from today based on current offset
  const getWeekDates = () => {
    const today = new Date()
    const todayLocal = getLocalDateString(today)
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() + (currentWeekOffset * 7))

    const weekDates = []
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)
      const dateString = getLocalDateString(date)
      weekDates.push({
        date: dateString,
        dayName: date.toLocaleDateString('en-US', { weekday: 'long' }),
        isPast: dateString < todayLocal,
        isToday: dateString === todayLocal
      })
    }
    return weekDates
  }

  const weekDates = getWeekDates()


  // Load sessions from database
  const loadSessions = async () => {
    try {
      setIsLoading(true)
      const sessionsData = await getSessions()
      setSessions(sessionsData)
    } catch (error) {
      console.error('Error loading sessions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSessions()
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
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setSelectedDate(session.date)
    setIsModalOpen(true)
  }

  const handleSessionSave = (session: Session) => {
    setSessions(prev => {
      if (editingSession) {
        // Update existing session - replace it
        return prev.map(s => s.id === session.id ? session : s)
      } else {
        // Add new session - avoid duplicates
        const exists = prev.some(s => s.id === session.id)
        if (exists) {
          return prev.map(s => s.id === session.id ? session : s)
        }
        return [...prev, session]
      }
    })
  }

  const handleSessionSaveMultiple = (newSessions: Session[]) => {
    setSessions(prev => {
      if (editingSession) {
        // For updates/conversions: remove the old session(s) and add new ones
        // Filter out the editing session by ID
        const withoutEditing = prev.filter(s => s.id !== editingSession.id)
        // Add all the new/updated sessions, avoiding duplicates
        const newSessionIds = new Set(newSessions.map(s => s.id))
        const withoutDuplicates = withoutEditing.filter(s => !newSessionIds.has(s.id))
        return [...withoutDuplicates, ...newSessions]
      } else {
        // Creating new sessions: just add them, avoiding duplicates
        const existingIds = new Set(prev.map(s => s.id))
        const trulyNew = newSessions.filter(s => !existingIds.has(s.id))
        return [...prev, ...trulyNew]
      }
    })
  }

  const handleDeleteSession = (sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
  }

  // Refetch sessions when bulk deletions occur
  const handleBulkDelete = async () => {
    try {
      const updatedSessions = await getSessions()
      setSessions(updatedSessions)
    } catch (error) {
      console.error('Error refetching sessions:', error)
    }
  }

  const getSessionsForDate = (date: string) => {
    return sessions.filter(session => session.date === date)
  }

  const handleSyncWeek = async () => {
    const weekDates = getWeekDates().map(d => d.date)
    const unsyncedSessions = sessions.filter(
      s => weekDates.includes(s.date) && !s.synced_to_therapynotes
    )

    if (!unsyncedSessions.length) {
      setSyncStatus('All sessions already synced')
      setTimeout(() => setSyncStatus(null), 3000)
      return
    }

    setIsSyncing(true)
    const syncedIds: string[] = []

    for (const [i, session] of unsyncedSessions.entries()) {
      try {
        const response = await fetch(`/api/therapynotes/sync-session/${session.id}`, {
          method: 'POST'
        })
        if (response.ok) {
          syncedIds.push(session.id)
          setSyncStatus(`Syncing ${i + 1}/${unsyncedSessions.length}...`)
        }
      } catch (error) {
        console.error('Sync error:', error)
      }
    }

    setSessions(prev => 
      prev.map(s => syncedIds.includes(s.id) ? { ...s, synced_to_therapynotes: true } : s)
    )
    setIsSyncing(false)
    setSyncStatus(`✓ ${syncedIds.length} synced`)
    setTimeout(() => setSyncStatus(null), 3000)
  }

  const handleSyncProgressNotes = async () => {
    const weekDates = getWeekDates().map(d => d.date)
    const sessionsWithUnsyncedNotes = sessions.filter(
      s => weekDates.includes(s.date) && 
          s.synced_to_therapynotes && 
          s.has_progress_note && 
          !s.progress_note_synced
    )

    if (!sessionsWithUnsyncedNotes.length) {
      setNoteSyncStatus('All progress notes already synced')
      setTimeout(() => setNoteSyncStatus(null), 3000)
      return
    }

    setIsSyncingNotes(true)
    const syncedIds: string[] = []

    for (const [i, session] of sessionsWithUnsyncedNotes.entries()) {
      try {
        const response = await fetch(`/api/therapynotes/sync-progress-note/${session.id}`, {
          method: 'POST'
        })
        if (response.ok) {
          syncedIds.push(session.id)
          setNoteSyncStatus(`Syncing notes ${i + 1}/${sessionsWithUnsyncedNotes.length}...`)
        } else {
          const errorData = await response.json()
          setNoteSyncStatus(`Error: ${errorData.error || `HTTP ${response.status}`}`)
        }
      } catch (error) {
        console.error('Progress note sync error:', error)
        setNoteSyncStatus('Error syncing note')
      }
    }

    setSessions(prev => 
      prev.map(s => syncedIds.includes(s.id) ? { ...s, progress_note_synced: true } : s)
    )
    setIsSyncingNotes(false)
    setNoteSyncStatus(`✓ ${syncedIds.length} notes synced`)
    setTimeout(() => setNoteSyncStatus(null), 3000)
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
              
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">
                  {(() => {
                    const today = new Date()
                    const startOfWeek = new Date(today)
                    startOfWeek.setDate(today.getDate() + (currentWeekOffset * 7))
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
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentWeekOffset(0)}
                  className="h-8 px-3 text-xs"
                >
                  Today
                </Button>

                {syncStatus && (
                  <span className="text-xs text-muted-foreground">
                    {syncStatus}
                  </span>
                )}

                {noteSyncStatus && (
                  <span className="text-xs text-muted-foreground">
                    {noteSyncStatus}
                  </span>
                )}

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSyncWeek}
                  disabled={isSyncing}
                  className="h-8 px-3 text-xs"
                >
                  {isSyncing ? 'Syncing...' : 'Sync to TherapyNotes'}
                </Button>

                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSyncProgressNotes}
                  disabled={isSyncingNotes}
                  className="h-8 px-3 text-xs"
                >
                  {isSyncingNotes ? 'Syncing Notes...' : 'Sync Progress Notes'}
                </Button>
              </div>
              
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
                      dayData.isPast ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="mb-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {dayData.dayName} <span className="text-sm text-muted-foreground font-normal">{formattedDate}</span>
                            </h3>
                            {dayData.isToday && (
                              <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded-full">
                                Today
                              </span>
                            )}
                          </div>
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
                    {isLoading ? (
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    ) : daySessions.length > 0 ? (
                      <div className="mt-2 space-y-2">
                        {daySessions.map((session) => (
                          <SessionCard
                            key={session.id}
                            session={session}
                            onEdit={handleEditSession}
                            onDelete={handleDeleteSession}
                            onBulkDelete={handleBulkDelete}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">No sessions</div>
                    )}
                  </Card>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Session Modal */}
      <SessionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingSession(null)
        }}
        selectedDate={selectedDate}
        editingSession={editingSession}
        onSave={handleSessionSave}
        onSaveMultiple={handleSessionSaveMultiple}
        onBulkDelete={handleBulkDelete}
      />
    </div>
  )
}