'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import SessionModal from './_components/session-modal'
import SessionCard from './_components/session-card'
import { getSessions } from '@/lib/api'
import type { Session } from '@/types'

export default function CalendarPage() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [syncTarget, setSyncTarget] = useState<'sessions' | 'notes' | null>(null)
  const [isSyncingNotes, setIsSyncingNotes] = useState(false)

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
  const loadSessions = useCallback(async () => {
    try {
      setIsLoading(true)
      const sessionsData = await getSessions()
      setSessions(sortSessions(sessionsData))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

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

  // Ensure sessions are always ordered by date then start time
  const sortSessions = (list: Session[]) =>
    [...list].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))

  const handleSessionSave = (session: Session) => {
    setSessions(prev => {
      if (editingSession) {
        // Update existing session - replace it
        return sortSessions(prev.map(s => s.id === session.id ? session : s))
      } else {
        // Add new session - avoid duplicates
        const exists = prev.some(s => s.id === session.id)
        if (exists) {
          return sortSessions(prev.map(s => s.id === session.id ? session : s))
        }
        return sortSessions([...prev, session])
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
        return sortSessions([...withoutDuplicates, ...newSessions])
      } else {
        // Creating new sessions: just add them, avoiding duplicates
        const existingIds = new Set(prev.map(s => s.id))
        const trulyNew = newSessions.filter(s => !existingIds.has(s.id))
        return sortSessions([...prev, ...trulyNew])
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
      setSessions(sortSessions(updatedSessions))
    } catch {
      // Silently handle refetch errors
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

    const totalSessions = unsyncedSessions.length

    if (!totalSessions) {
      setSyncTarget('sessions')
      setSyncStatus('Already synced')
      setTimeout(() => {
        setSyncStatus(null)
        setSyncTarget(null)
      }, 3000)
      return
    }

    setIsSyncing(true)
    setSyncTarget('sessions')
    const syncedIds: string[] = []
    setSyncStatus(`Syncing ${syncedIds.length}/${totalSessions}`)

    for (const session of unsyncedSessions) {
      try {
        const response = await fetch(`/api/therapynotes/sync-session/${session.id}`, {
          method: 'POST'
        })
        if (response.ok) {
          syncedIds.push(session.id)
          setSyncStatus(`Syncing ${syncedIds.length}/${totalSessions}`)
        }
      } catch {
        // Continue with next session
      }
    }

    setSessions(prev => 
      prev.map(s => syncedIds.includes(s.id) ? { ...s, synced_to_therapynotes: true } : s)
    )
    setIsSyncing(false)
    setSyncStatus(`Synced ${syncedIds.length}/${totalSessions}`)
    setTimeout(() => {
      setSyncStatus(null)
      setSyncTarget(null)
    }, 3000)
  }

  const handleSyncProgressNotes = async () => {
    const weekDates = getWeekDates().map(d => d.date)
    const unsyncedNotes = sessions.filter(s => 
      weekDates.includes(s.date) && 
      s.has_progress_note && 
      !s.progress_note_synced &&
      s.synced_to_therapynotes // Session must be synced first
    )

    const totalNotes = unsyncedNotes.length

    if (!totalNotes) {
      const hasUnsyncedSessions = sessions.some(s => 
        weekDates.includes(s.date) && 
        s.has_progress_note && 
        !s.progress_note_synced &&
        !s.synced_to_therapynotes
      )
      
      if (hasUnsyncedSessions) {
        setSyncTarget('notes')
        setSyncStatus('Sync sessions first')
        setTimeout(() => {
          setSyncStatus(null)
          setSyncTarget(null)
        }, 3000)
      } else {
        setSyncTarget('notes')
        setSyncStatus('Already synced')
        setTimeout(() => {
          setSyncStatus(null)
          setSyncTarget(null)
        }, 3000)
      }
      return
    }

    setIsSyncingNotes(true)
    setSyncTarget('notes')
    const syncedIds: string[] = []
    setSyncStatus(`Syncing ${syncedIds.length}/${totalNotes}`)

    for (const session of unsyncedNotes) {
      try {
        // Fetch the progress note for this session
        const noteResponse = await fetch(`/api/notes/${session.id}`)
        const { data: note } = await noteResponse.json()

        if (!note) {
          continue
        }

        // Sync the note to TherapyNotes
        const response = await fetch(`/api/therapynotes/sync-note/${note.id}`, { method: 'POST' })
        const result = await response.json()

        if (result.success) {
          syncedIds.push(session.id)
          setSyncStatus(`Syncing ${syncedIds.length}/${totalNotes}`)
        }
      } catch {
        // Continue with next session
      }
    }

    // Update local state to reflect synced notes
    setSessions(prev => 
      prev.map(s => syncedIds.includes(s.id) ? { ...s, progress_note_synced: true } : s)
    )
    
    setIsSyncingNotes(false)
    setSyncStatus(`Synced ${syncedIds.length}/${totalNotes}`)
    setTimeout(() => {
      setSyncStatus(null)
      setSyncTarget(null)
    }, 3000)
  }

  const renderSyncLabel = (target: 'sessions' | 'notes', defaultLabel: string) => {
    if (syncTarget !== target || !syncStatus) {
      return defaultLabel
    }

    if (syncStatus.startsWith('Syncing')) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5 animate-spin text-white/90"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
          {syncStatus}
        </span>
      )
    }

    if (syncStatus.startsWith('Synced')) {
      return (
        <span className="inline-flex items-center gap-1.5">
          <svg
            className="h-3.5 w-3.5 text-white"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {syncStatus}
        </span>
      )
    }

    return syncStatus
  }

  return (
    <>
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="py-6">
            <div className="mb-6 flex items-center justify-between gap-3">
              <h1 className="text-3xl font-bold text-foreground">Calendar</h1>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSyncWeek}
                  disabled={isSyncing || isSyncingNotes}
                  className="h-8 px-2 sm:px-3 text-xs text-white bg-[var(--primary)] hover:bg-[var(--primary)] hover:brightness-110 whitespace-nowrap"
                  style={{ backgroundImage: 'none' }}
                >
                  {renderSyncLabel('sessions', 'Sync Sessions')}
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSyncProgressNotes}
                  disabled={isSyncingNotes || isSyncing}
                  className="h-8 px-2 sm:px-3 text-xs text-white bg-[var(--secondary)] hover:bg-[var(--secondary)] hover:brightness-110 whitespace-nowrap"
                  style={{ backgroundImage: 'none' }}
                >
                  {renderSyncLabel('notes', 'Sync Notes')}
                </Button>
              </div>
            </div>

            {/* Weekly Calendar */}
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
            >
              {/* Week Days */}
              {weekDates.map((dayData) => {
                const daySessions = getSessionsForDate(dayData.date)
                const formattedDate = formatDate(dayData.date)
                
                return (
                  <Card 
                    key={dayData.date} 
                    className={`px-4 pt-4 pb-3 cursor-pointer hover:bg-muted/30 transition-colors border ${
                      dayData.isToday ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]/30' : 'border-border'
                    }`}
                    >
                     <div className="mb-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">
                              {dayData.dayName}{' '}
                              <span className="text-sm font-normal text-muted-foreground">
                                {formattedDate}
                              </span>
                            </h3>
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
                      <div className="border-t border-border divide-y divide-border">
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
                      <span className="sr-only" aria-live="polite">
                        No sessions scheduled
                      </span>
                    )}
                  </Card>
                )
              })}
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
    </>
  )
}