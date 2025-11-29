'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import SessionModal from './_components/session-modal'
import ImportCalendarModal from './_components/import-calendar-modal'
import { getSessions } from '@/lib/api'
import type { Session } from '@/types'

// Helpers
const formatTime = (timeString: string) => {
  const [hours, minutes] = timeString.split(':').map(Number)
  const d = new Date()
  d.setHours(hours, minutes, 0, 0)
  return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    .format(d).replace(':00', '').toLowerCase()
}

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

const sortSessions = (list: Session[]) =>
  [...list].sort((a, b) => a.date.localeCompare(b.date) || a.start_time.localeCompare(b.start_time))

const padTime = (n: number) => n.toString().padStart(2, '0')

const timeSlots = Array.from({ length: 16 }, (_, i) => {
  const hour = 8 + i
  return { hour, label: formatTime(`${padTime(hour)}:00`), timeString: `${padTime(hour)}:00` }
})

export default function CalendarPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState<Session[]>([])
  const [selectedDate, setSelectedDate] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [offset, setOffset] = useState(0)
  const [view, setView] = useState<'day' | 'week' | 'month'>('week')
  const [syncTarget, setSyncTarget] = useState<'sessions' | 'notes' | null>(null)
  const [syncStatus, setSyncStatus] = useState<string | null>(null)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)
  const [draggedSession, setDraggedSession] = useState<Session | null>(null)
  const dragOffsetRef = useRef({ y: 0, startMinutes: 0 })

  const todayLocal = useMemo(() => getLocalDateString(new Date()), [])

  // Date calculations
  const weekDates = useMemo(() => {
    if (view !== 'week') return []
    const today = new Date()
    const sunday = new Date(today)
    sunday.setDate(today.getDate() - today.getDay() + offset * 7)
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(sunday)
      date.setDate(sunday.getDate() + i)
      const dateString = getLocalDateString(date)
      return {
        date: dateString,
        dayName: date.toLocaleDateString('en-US', { weekday: 'short' }),
        dayNumber: date.getDate(),
        isToday: dateString === todayLocal
      }
    })
  }, [view, offset, todayLocal])

  const dayDate = useMemo(() => {
    if (view !== 'day') return null
    const targetDate = new Date()
    targetDate.setDate(targetDate.getDate() + offset)
    const dateString = getLocalDateString(targetDate)
    return {
      date: dateString,
      dayName: targetDate.toLocaleDateString('en-US', { weekday: 'short' }),
      dayNumber: targetDate.getDate(),
      month: targetDate.toLocaleDateString('en-US', { month: 'long' }),
      year: targetDate.getFullYear(),
      isToday: dateString === todayLocal
    }
  }, [view, offset, todayLocal])

  const monthData = useMemo(() => {
    if (view !== 'month') return null
    const today = new Date()
    const targetDate = new Date(today.getFullYear(), today.getMonth() + offset, 1)
    const year = targetDate.getFullYear()
    const month = targetDate.getMonth()
    
    const startDate = new Date(year, month, 1)
    startDate.setDate(1 - startDate.getDay())
    
    const endDate = new Date(year, month + 1, 0)
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()))
    
    const dates = []
    const current = new Date(startDate)
    while (current <= endDate) {
      const dateString = getLocalDateString(current)
      dates.push({
        date: dateString,
        dayNumber: current.getDate(),
        isCurrentMonth: current.getMonth() === month,
        isToday: dateString === todayLocal
      })
      current.setDate(current.getDate() + 1)
    }
    
    return { dates, month: targetDate.toLocaleDateString('en-US', { month: 'long' }), year }
  }, [view, offset, todayLocal])

  // Load sessions
  const loadSessions = useCallback(async () => {
    const data = await getSessions()
    setSessions(sortSessions(data))
  }, [])

  useEffect(() => { loadSessions() }, [loadSessions])

  // Global dragover handler
  useEffect(() => {
    if (!draggedSession) return
    const handler = (e: DragEvent) => {
      e.preventDefault()
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move'
    }
    document.addEventListener('dragover', handler)
    return () => document.removeEventListener('dragover', handler)
  }, [draggedSession])

  // Session helpers
  const getSessionsForSlot = (dateString: string, hour: number) =>
    sessions.filter(s => s.date === dateString && parseInt(s.start_time.split(':')[0]) === hour)
      .sort((a, b) => a.start_time.localeCompare(b.start_time))

  const getSessionPosition = (session: Session) => {
    const [sh, sm] = session.start_time.split(':').map(Number)
    const [eh, em] = session.end_time.split(':').map(Number)
    return { top: sm, height: Math.max((eh * 60 + em) - (sh * 60 + sm), 20) }
  }

  const getCurrentTimePosition = (dateString: string) => {
    if (dateString !== todayLocal) return null
    const now = new Date()
    const h = now.getHours(), m = now.getMinutes()
    if (h < 8 || h > 23) return null
    return Math.min((h - 8) * 60 + m, 960)
  }

  const getSessionStyle = (session: Session) => {
    const synced = session.has_progress_note && session.progress_note_synced
    // Use secondary (purple) for synced notes, primary (cyan) for others
    return synced 
      ? 'bg-[var(--secondary)]/25 hover:bg-[var(--secondary)]/35' 
      : 'bg-[var(--primary)]/20 hover:bg-[var(--primary)]/30'
  }

  // Handlers
  const openModal = (date: string, time = '') => {
    setSelectedDate(date)
    setSelectedTime(time)
    setEditingSession(null)
    setIsModalOpen(true)
  }

  const handleEditSession = (session: Session) => {
    setEditingSession(session)
    setSelectedDate(session.date)
    setIsModalOpen(true)
  }

  const handleDragStart = (e: React.DragEvent, session: Session) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const [h, m] = session.start_time.split(':').map(Number)
    dragOffsetRef.current = { y: e.clientY - rect.top, startMinutes: h * 60 + m }
    setDraggedSession(session)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', session.id)
    ;(e.currentTarget as HTMLElement).style.opacity = '0.5'
  }

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedSession(null)
    ;(e.currentTarget as HTMLElement).style.opacity = '1'
  }

  const handleDrop = async (e: React.DragEvent, targetDate: string, slotHour: number) => {
    e.preventDefault()
    const session = draggedSession
    if (!session) return

    const rect = e.currentTarget.getBoundingClientRect()
    const rawMins = slotHour * 60 + (e.clientY - rect.top) - dragOffsetRef.current.y
    const snapped = Math.max(480, Math.min(1380, Math.round(rawMins / 15) * 15))
    
    const newStart = `${padTime(Math.floor(snapped / 60))}:${padTime(snapped % 60)}`
    const [oh, om] = session.start_time.split(':').map(Number)
    const [eh, em] = session.end_time.split(':').map(Number)
    const duration = (eh * 60 + em) - (oh * 60 + om)
    const endMins = snapped + duration
    const newEnd = `${padTime(Math.floor(endMins / 60))}:${padTime(endMins % 60)}`

    setDraggedSession(null)
    const optimistic = { ...session, date: targetDate, start_time: newStart, end_time: newEnd }
    setSessions(prev => sortSessions([...prev.filter(s => s.id !== session.id), optimistic]))

    try {
      const { updateSessionWithScope } = await import('@/lib/api')
      const updated = await updateSessionWithScope(session.id, {
        client_id: session.client_id, date: targetDate, start_time: newStart, end_time: newEnd, update_scope: 'single'
      })
      setSessions(prev => sortSessions([...prev.filter(s => s.id !== session.id), ...updated]))
    } catch (err) {
      console.error('Failed to update session:', err)
      setSessions(prev => sortSessions([...prev.filter(s => s.id !== session.id), session]))
    }
  }

  const handleSessionSave = (session: Session) => {
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== session.id)
      return sortSessions([...filtered, session])
    })
  }

  const handleSessionSaveMultiple = (newSessions: Session[]) => {
    setSessions(prev => {
      const ids = new Set(newSessions.map(s => s.id))
      if (editingSession) ids.add(editingSession.id)
      return sortSessions([...prev.filter(s => !ids.has(s.id)), ...newSessions])
    })
  }

  const handleBulkDelete = async () => {
    try { setSessions(sortSessions(await getSessions())) } catch {}
  }

  const handleSync = async (type: 'sessions' | 'notes') => {
    const items = sessions.filter(s => {
      const ended = new Date(`${s.date}T${s.end_time}`) < new Date()
      if (type === 'sessions') return ended && !s.synced_to_therapynotes
      return ended && s.synced_to_therapynotes && s.has_progress_note && !s.progress_note_synced
    })
    if (!items.length) return

    setSyncTarget(type)
    const syncedIds: string[] = []
    setSyncStatus(`Syncing 0/${items.length}`)

    for (const session of items) {
      try {
        if (type === 'sessions') {
          const res = await fetch(`/api/therapynotes/sync-session/${session.id}`, { method: 'POST' })
          if (res.ok) syncedIds.push(session.id)
        } else {
          const noteRes = await fetch(`/api/notes/${session.id}`)
          const { data: note } = await noteRes.json()
          if (!note) continue
          const res = await fetch(`/api/therapynotes/sync-note/${note.id}`, { method: 'POST' })
          if ((await res.json()).success) syncedIds.push(session.id)
        }
        setSyncStatus(`Syncing ${syncedIds.length}/${items.length}`)
      } catch {}
    }

    const field = type === 'sessions' ? 'synced_to_therapynotes' : 'progress_note_synced'
    setSessions(prev => prev.map(s => syncedIds.includes(s.id) ? { ...s, [field]: true } : s))
    setSyncTarget(null)
    setSyncStatus(null)
  }

  // Computed values
  const isSyncing = syncTarget !== null
  const pastUnsyncedCount = sessions.filter(s => new Date(`${s.date}T${s.end_time}`) < new Date() && !s.synced_to_therapynotes).length
  const unsyncedNotesCount = sessions.filter(s => {
    const ended = new Date(`${s.date}T${s.end_time}`) < new Date()
    return ended && s.synced_to_therapynotes && s.has_progress_note && !s.progress_note_synced
  }).length

  const displayTitle = useMemo(() => {
    if (view === 'day' && dayDate) return `${dayDate.month} ${dayDate.dayNumber}, ${dayDate.year}`
    if (view === 'week' && weekDates.length) {
      const start = parseLocalDateString(weekDates[0].date)
      const end = parseLocalDateString(weekDates[6].date)
      const sm = start.toLocaleDateString('en-US', { month: 'short' })
      const em = end.toLocaleDateString('en-US', { month: 'short' })
      const sy = start.getFullYear(), ey = end.getFullYear()
      if (sm !== em || sy !== ey) return sy === ey ? `${sm} - ${em} ${sy}` : `${sm} ${sy} - ${em} ${ey}`
      return `${start.toLocaleDateString('en-US', { month: 'long' })} ${sy}`
    }
    if (view === 'month' && monthData) return `${monthData.month} ${monthData.year}`
    return ''
  }, [view, dayDate, weekDates, monthData])

  // Render helpers
  const SessionIcons = ({ session }: { session: Session }) => {
    const isFuture = new Date(`${session.date}T${session.start_time}`) > new Date()
    return (
      <div className="flex items-center gap-1 flex-shrink-0">
        {session.synced_to_therapynotes && (
          <svg className="w-3 h-3 text-[var(--primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ filter: 'drop-shadow(0 0 2px rgba(0,191,255,0.35))' }}>
            <title>Synced</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        )}
        {!isFuture && session.has_progress_note && session.synced_to_therapynotes && (
          <svg className="w-3 h-3 text-[var(--primary)] cursor-pointer" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            onClick={(e) => { e.stopPropagation(); router.push(`/notes/${session.id}`) }}>
            <title>Note</title>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
    )
  }

  const SessionCard = ({ session, position }: { session: Session; position: { top: number; height: number } }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, session)}
      onDragEnd={handleDragEnd}
      onClick={(e) => { e.stopPropagation(); handleEditSession(session) }}
      className="absolute rounded-md text-xs cursor-grab active:cursor-grabbing overflow-hidden"
      style={{ left: 2, right: 2, top: position.top + 2, height: Math.max(position.height - 4, 20), minHeight: 20, zIndex: 1 }}
    >
      <div className="absolute inset-0 rounded-md bg-background" />
      <div className={`absolute inset-0 rounded-md ${getSessionStyle(session)}`} />
      <div className="relative p-1.5">
        <div className="flex items-center justify-between gap-1 mb-0.5">
          <div className="font-medium text-xs">{formatTime(session.start_time)}</div>
          <SessionIcons session={session} />
        </div>
        <div className="text-xs text-muted-foreground truncate">{session.clients?.name || 'Unknown Client'}</div>
      </div>
    </div>
  )

  const TimeLabel = ({ hour, label }: { hour: number; label: string }) => (
    <div className="pr-3 text-sm text-muted-foreground text-right min-h-[60px] relative">
      {hour !== 8 && <span className="absolute top-0 right-3" style={{ transform: 'translateY(-50%)', lineHeight: 1 }}>{label}</span>}
    </div>
  )

  const CurrentTimeIndicator = ({ position, left, width }: { position: number; left: string; width: string }) => (
    <div className="absolute left-0 right-0 pointer-events-none z-20" style={{ top: position }}>
      <div className="absolute w-3 h-3 rounded-full bg-[var(--primary)]" style={{ left, transform: 'translate(-50%, -50%)' }} />
      <div className="absolute border-t-2 border-[var(--primary)]" style={{ left, width }} />
    </div>
  )

  const SyncButton = ({ type, count, label }: { type: 'sessions' | 'notes'; count: number; label: string }) => {
    const isActive = count > 0
    const isSyncingThis = syncTarget === type
    
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleSync(type)}
        disabled={!isActive || isSyncing}
        className={`h-8 px-2 sm:px-3 text-xs whitespace-nowrap ${
          isActive 
            ? type === 'sessions'
              ? 'bg-[var(--primary)] border-[var(--primary)] text-white hover:bg-[var(--primary)]/90 hover:text-white'
              : 'bg-[var(--secondary)] border-[var(--secondary)] text-white hover:bg-[var(--secondary)]/90 hover:text-white'
            : ''
        }`}
      >
        {isSyncingThis && syncStatus?.startsWith('Syncing') ? (
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            {syncStatus}
          </span>
        ) : label}
      </Button>
    )
  }

  const gridCols = view === 'week' ? '60px repeat(7, 1fr)' : '60px 1fr'
  const dayColumns = view === 'week' ? weekDates : dayDate ? [dayDate] : []

  return (
    <>
      <div className="container mx-auto px-3 sm:px-4 max-w-6xl">
        <div className="py-4 sm:py-6">
          {/* Header */}
          <div className="mb-4 sm:mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex items-center flex-wrap gap-2 sm:gap-3">
              <Button variant="outline" size="sm" onClick={() => setOffset(0)} className="h-8 px-2 sm:px-3 text-xs">Today</Button>
              <div className="flex items-center gap-0.5 sm:gap-1">
                <Button variant="ghost" size="sm" onClick={() => setOffset(o => o - 1)} className="h-8 w-8 p-0" aria-label="Previous">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setOffset(o => o + 1)} className="h-8 w-8 p-0" aria-label="Next">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </Button>
                <h2 className="text-lg sm:text-2xl font-semibold text-foreground whitespace-nowrap ml-0.5 sm:ml-1">{displayTitle}</h2>
              </div>
              <div className="inline-flex items-center rounded-lg bg-muted/60 p-1">
                {(['day', 'week', 'month'] as const).map(v => (
                  <button key={v} onClick={() => { setView(v); setOffset(0) }}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${view === v ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => setIsImportModalOpen(true)}
                className="h-8 px-2 sm:px-3 text-xs bg-[var(--primary)] border-[var(--primary)] text-white hover:bg-[var(--primary)]/90 hover:text-white">
                Import Sessions
              </Button>
              <SyncButton type="sessions" count={pastUnsyncedCount} label={pastUnsyncedCount > 0 ? `Sync Sessions (${pastUnsyncedCount})` : 'Sessions Synced'} />
              <SyncButton type="notes" count={unsyncedNotesCount} label={unsyncedNotesCount > 0 ? `Sync Notes (${unsyncedNotesCount})` : 'Notes Synced'} />
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="overflow-auto pb-6" style={{ maxHeight: 'calc(100vh - 120px)' }}>
            {/* Week/Day View */}
            {(view === 'week' || view === 'day') && dayColumns.length > 0 && (
              <div style={{ minWidth: view === 'week' ? 800 : 400 }}>
                {/* Headers */}
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm grid" style={{ gridTemplateColumns: gridCols }}>
                  <div className="p-2 min-h-[44px] sm:min-h-[48px]" />
                  {dayColumns.map(d => (
                    <div key={d.date} className={`border-b border-border p-2 sm:p-2.5 text-center flex items-center justify-center min-h-[44px] sm:min-h-[48px] ${d.isToday ? 'bg-[var(--primary)]/10' : ''}`}>
                      <div className={`font-semibold text-xs sm:text-sm ${d.isToday ? 'text-[var(--primary)]' : 'text-muted-foreground'}`}>
                        {d.dayName} {d.dayNumber}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time Grid */}
                <div className="relative">
                  {timeSlots.map((slot, i) => (
                    <div key={slot.timeString} className="grid items-stretch" style={{ gridTemplateColumns: gridCols }}>
                      <TimeLabel hour={slot.hour} label={slot.label} />
                      {dayColumns.map(d => {
                        const cellSessions = getSessionsForSlot(d.date, slot.hour)
                        return (
                          <div key={`${d.date}-${slot.timeString}`}
                            className={`border-r border-border last:border-r-0 min-h-[60px] relative cursor-pointer hover:bg-muted/30 overflow-visible ${i > 0 ? 'border-t border-border' : ''}`}
                            onClick={() => openModal(d.date, slot.timeString)}
                            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move' }}
                            onDrop={(e) => handleDrop(e, d.date, slot.hour)}>
                            {cellSessions.map(s => <SessionCard key={s.id} session={s} position={getSessionPosition(s)} />)}
                          </div>
                        )
                      })}
                    </div>
                  ))}

                  {/* Current Time Indicator */}
                  {view === 'week' && weekDates.some(d => d.isToday) && (() => {
                    const idx = weekDates.findIndex(d => d.isToday)
                    const pos = getCurrentTimePosition(weekDates[idx]?.date || '')
                    if (!pos) return null
                    return <CurrentTimeIndicator position={pos} left={`calc(60px + (100% - 60px) * ${idx} / 7)`} width="calc((100% - 60px) / 7)" />
                  })()}
                  {view === 'day' && dayDate?.isToday && (() => {
                    const pos = getCurrentTimePosition(dayDate.date)
                    return pos ? <CurrentTimeIndicator position={pos} left="60px" width="calc(100% - 60px)" /> : null
                  })()}
                </div>
              </div>
            )}

            {/* Month View */}
            {view === 'month' && monthData && (
              <div style={{ minWidth: 700 }}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm grid grid-cols-7">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="p-2 sm:p-2.5 text-center flex items-center justify-center min-h-[44px] sm:min-h-[48px]">
                      <div className="font-semibold text-xs sm:text-sm text-muted-foreground">{day}</div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7">
                  {monthData.dates.map(d => {
                    const daySessions = sessions.filter(s => s.date === d.date).sort((a, b) => a.start_time.localeCompare(b.start_time))
                    return (
                      <div key={d.date}
                        className={`min-h-[120px] border-b border-r border-border [&:nth-child(7n)]:border-r-0 p-2 cursor-pointer hover:bg-muted/30 ${!d.isCurrentMonth ? 'bg-muted/20' : ''} ${d.isToday ? 'bg-[var(--primary)]/10' : ''}`}
                        onClick={() => openModal(d.date)}>
                        <div className={!d.isCurrentMonth ? 'opacity-50' : ''}>
                          <div className={`font-semibold text-sm mb-1.5 ${d.isToday ? 'text-[var(--primary)]' : 'text-muted-foreground'}`}>{d.dayNumber}</div>
                          <div className="space-y-1">
                            {daySessions.slice(0, 4).map(s => (
                              <div 
                                key={s.id} 
                                onClick={(e) => { e.stopPropagation(); handleEditSession(s) }}
                                className="text-xs rounded-md cursor-pointer overflow-hidden relative"
                              >
                                <div className="absolute inset-0 rounded-md bg-background" />
                                <div className={`absolute inset-0 rounded-md ${getSessionStyle(s)}`} />
                                <div className="relative p-1.5">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-medium truncate">{formatTime(s.start_time)}</span>
                                    <SessionIcons session={s} />
                                  </div>
                                  <div className="truncate text-muted-foreground text-xs">{s.clients?.name || 'Unknown Client'}</div>
                                </div>
                              </div>
                            ))}
                            {daySessions.length > 4 && <div className="text-xs text-muted-foreground pt-0.5">+{daySessions.length - 4} more</div>}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <SessionModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingSession(null); setSelectedTime('') }}
        selectedDate={selectedDate}
        selectedTime={selectedTime}
        editingSession={editingSession}
        onSave={handleSessionSave}
        onSaveMultiple={handleSessionSaveMultiple}
        onBulkDelete={handleBulkDelete}
      />
      <ImportCalendarModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={(s) => setSessions(prev => sortSessions([...prev, ...s]))} />
    </>
  )
}
