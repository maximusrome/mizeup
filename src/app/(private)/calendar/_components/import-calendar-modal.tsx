'use client'

import { useState, useEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { fetchCalendarEvents, importCalendarSessions, createClient } from '@/lib/api'
import type { Client, CalendarEventWithMapping, Session } from '@/types'

const DROPDOWN_CLOSE_DELAY = 200

function DropdownPositioner({ inputId, dropdownId, children }: { inputId: string; dropdownId: string; children: ReactNode }) {
  useEffect(() => {
    const updatePosition = () => {
      const input = document.getElementById(inputId)
      const dropdown = document.getElementById(dropdownId)
      if (input && dropdown) {
        const rect = input.getBoundingClientRect()
        dropdown.style.top = `${rect.bottom + 4}px`
        dropdown.style.left = `${rect.left}px`
        dropdown.style.width = `${rect.width}px`
      }
    }
    
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [inputId, dropdownId])
  
  return <>{children}</>
}

export default function ImportCalendarModal({
  isOpen,
  onClose,
  onImport
}: {
  isOpen: boolean
  onClose: () => void
  onImport: (sessions: Session[]) => void
}) {
  const [events, setEvents] = useState<CalendarEventWithMapping[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(false)
  const [importing, setImporting] = useState(false)
  const [needsSetup, setNeedsSetup] = useState(false)
  const [creatingClientForEvent, setCreatingClientForEvent] = useState<string | null>(null)
  const isCreatingClientRef = useRef(false)
  const [clientSearchStates, setClientSearchStates] = useState<Record<string, {
    query: string
    showDropdown: boolean
    activeIndex: number
  }>>({})

  // Helper to update search state for a specific event
  const updateSearchState = (eventUid: string, updates: Partial<{ query: string; showDropdown: boolean; activeIndex: number }>) => {
    setClientSearchStates(prev => ({
      ...prev,
      [eventUid]: { ...(prev[eventUid] || { query: '', showDropdown: false, activeIndex: 0 }), ...updates }
    }))
  }

  // Helper to update event match
  const updateEventMatch = (eventUid: string, client: Client | null) => {
    setEvents(prev => prev.map(e => 
      e.uid === eventUid
        ? { 
            ...e, 
            matchedClientId: client?.id, 
            matchedClientName: client?.name, 
            selected: !!client 
          }
        : e
    ))
  }

  useEffect(() => {
    if (isOpen) {
      setImporting(false)
      loadEvents()
    }
  }, [isOpen])

  const loadEvents = async () => {
    setLoading(true)
    try {
      const { events: fetched, clients: fetchedClients, needsSetup: setupRequired } = await fetchCalendarEvents()
      
      if (setupRequired) {
        setNeedsSetup(true)
      } else {
        setEvents(fetched || [])
        setClients(fetchedClients || [])
        
        // Initialize search states with matched client names
        const initialStates: Record<string, { query: string; showDropdown: boolean; activeIndex: number }> = {}
        fetched?.forEach(e => {
          if (e.matchedClientName) {
            initialStates[e.uid] = { query: e.matchedClientName, showDropdown: false, activeIndex: 0 }
          }
        })
        setClientSearchStates(initialStates)
        
        setNeedsSetup(false)
      }
    } catch {
      // Silently handle errors - UI will show appropriate state
    }
    setLoading(false)
  }

  const capitalizeName = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const handleCreateClient = async (name: string, eventUid: string) => {
    const trimmedName = name.trim()
    if (!trimmedName || isCreatingClientRef.current) return

    try {
      setCreatingClientForEvent(eventUid)
      isCreatingClientRef.current = true
      const capitalizedName = capitalizeName(trimmedName)
      const newClient = await createClient({ name: capitalizedName })
      setClients(prev => [...prev, newClient])
      
      updateEventMatch(eventUid, newClient)
      updateSearchState(eventUid, { query: newClient.name, showDropdown: false, activeIndex: 0 })
    } catch {
      // Keep dropdown open on error
      updateSearchState(eventUid, { showDropdown: true })
    } finally {
      setCreatingClientForEvent(null)
      isCreatingClientRef.current = false
    }
  }

  const formatDateTime = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return {
      date: `${year}-${month}-${day}`,
      time: `${hours}:${minutes}:00`
    }
  }

  const handleImport = async () => {
    setImporting(true)
    try {
      const selected = events.filter(e => e.selected && e.matchedClientId)
      const sessions = selected.map(e => {
        const start = formatDateTime(new Date(e.start))
        const end = formatDateTime(new Date(e.end))
        
        return {
          client_id: e.matchedClientId!,
          date: start.date,
          start_time: start.time,
          end_time: end.time,
          calendar_title: e.title
        }
      })

      const imported = await importCalendarSessions(sessions)
      
      onImport(imported)
      onClose()
    } catch {
      alert('Failed to import sessions. Please try again.')
      setImporting(false)
    }
  }

  if (!isOpen) return null

  const selectedCount = events.filter(e => e.selected && e.matchedClientId).length

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {needsSetup ? 'Calendar Not Connected' : 'Import Sessions'}
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground h-10 w-10 p-0 rounded-full text-lg"
            >
              ×
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto overflow-x-visible space-y-4">
          {needsSetup ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please connect your Apple or Google calendar in your Account first.
              </p>
              <Button variant="outline" onClick={onClose} className="w-full">
                Close
              </Button>
            </div>
          ) : loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Loading events...
            </p>
          ) : events.length === 0 ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 text-green-600 mb-3">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium">All caught up!</p>
              <p className="text-xs text-muted-foreground mt-1">No new sessions to import.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Match each session to a client to import
              </p>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto overflow-x-visible">
                {events.map((event) => {
                  const searchState = clientSearchStates[event.uid] || { 
                    query: event.matchedClientName || '', 
                    showDropdown: false, 
                    activeIndex: 0 
                  }
                  const filteredClients = clients.filter(c => 
                    c.name.toLowerCase().includes(searchState.query.toLowerCase())
                  )
                  const hasMatch = !!event.matchedClientId
                  const inputId = `input-${event.uid}`
                  const dropdownId = `dropdown-${event.uid}`
                  
                  const trimmedInput = searchState.query.trim()
                  const trimmedInputLower = trimmedInput.toLowerCase()
                  const hasExactMatch = clients.some(c => c.name.toLowerCase() === trimmedInputLower)
                  const isCreating = creatingClientForEvent === event.uid
                  const showCreateOption = trimmedInput.length > 0 && !hasExactMatch && !isCreating
                  const totalOptions = filteredClients.length + (showCreateOption ? 1 : 0)

                  return (
                    <div key={event.uid} className="border rounded-lg p-2.5 hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={event.selected}
                          disabled={!hasMatch}
                          onChange={(e) => {
                            setEvents(prev => prev.map(ev => 
                              ev.uid === event.uid ? { ...ev, selected: e.target.checked } : ev
                            ))
                          }}
                          className="h-4 w-4 rounded border-input text-primary focus:ring-primary flex-shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div className="flex-1 min-w-[250px] flex items-baseline gap-2">
                            <span className="font-medium">{event.title}</span>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                              {new Date(event.start).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="relative w-64 flex-shrink-0">
                            <Input
                                id={inputId}
                                placeholder="Match to client..."
                                value={searchState.query}
                              onChange={(e) => {
                                const query = e.target.value
                                updateSearchState(event.uid, { query, showDropdown: true, activeIndex: 0 })
                                
                                const match = clients.find(c => 
                                  c.name.toLowerCase() === query.trim().toLowerCase()
                                )
                                
                                updateEventMatch(event.uid, match || null)
                              }}
                              onFocus={() => {
                                updateSearchState(event.uid, { showDropdown: true })
                              }}
                              onBlur={() => {
                                setTimeout(() => {
                                  updateSearchState(event.uid, { showDropdown: false })
                                }, DROPDOWN_CLOSE_DELAY)
                              }}
                              onKeyDown={(e) => {
                                if (totalOptions === 0) return
                                
                                if (e.key === 'ArrowDown') {
                                  e.preventDefault()
                                  const currentIndex = searchState.activeIndex
                                  updateSearchState(event.uid, { 
                                    showDropdown: true, 
                                    activeIndex: Math.min(currentIndex + 1, totalOptions - 1) 
                                  })
                                } else if (e.key === 'ArrowUp') {
                                  e.preventDefault()
                                  const currentIndex = searchState.activeIndex
                                  updateSearchState(event.uid, { 
                                    showDropdown: true, 
                                    activeIndex: Math.max(currentIndex - 1, 0) 
                                  })
                                } else if (e.key === 'Enter') {
                                  if (!searchState.showDropdown) return
                                  e.preventDefault()
                                  const isCreateOption = showCreateOption && searchState.activeIndex === filteredClients.length
                                  if (isCreateOption && trimmedInput) {
                                    handleCreateClient(trimmedInput, event.uid)
                                  } else {
                                    const client = filteredClients[searchState.activeIndex]
                                    if (client) {
                                      updateEventMatch(event.uid, client)
                                      updateSearchState(event.uid, { query: client.name, showDropdown: false, activeIndex: 0 })
                                    }
                                  }
                                } else if (e.key === 'Escape') {
                                  updateSearchState(event.uid, { showDropdown: false })
                                }
                              }}
                                className="text-sm"
                                autoComplete="off"
                              />
                              {searchState.showDropdown && (filteredClients.length > 0 || showCreateOption) && (
                                <DropdownPositioner inputId={inputId} dropdownId={dropdownId}>
                                  <div 
                                    id={dropdownId}
                                    className="fixed z-[60] bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto"
                                  >
                                  {filteredClients.length > 0 && filteredClients.map((client, index) => (
                                    <button
                                      key={client.id}
                                      type="button"
                                      className={`w-full px-3 py-2 text-left text-sm focus:outline-none border-b border-border ${
                                        index === searchState.activeIndex
                                          ? 'bg-primary/10 text-primary'
                                          : 'hover:bg-muted'
                                      }`}
                                      onMouseEnter={() => {
                                        updateSearchState(event.uid, { activeIndex: index })
                                      }}
                                      onClick={() => {
                                        updateEventMatch(event.uid, client)
                                        updateSearchState(event.uid, { query: client.name, showDropdown: false, activeIndex: 0 })
                                      }}
                                    >
                                      {client.name}
                                    </button>
                                  ))}
                                  {showCreateOption && (
                                    <button
                                      type="button"
                                      className={`w-full px-3 py-2 text-left text-sm focus:outline-none border-t border-border ${
                                        searchState.activeIndex === filteredClients.length
                                          ? 'bg-primary/10 text-primary'
                                          : 'hover:bg-muted'
                                      }`}
                                      onMouseEnter={() => {
                                        updateSearchState(event.uid, { activeIndex: filteredClients.length })
                                      }}
                                      onMouseDown={(e) => {
                                        e.preventDefault()
                                        handleCreateClient(trimmedInput, event.uid)
                                      }}
                                      disabled={isCreating}
                                    >
                                      {isCreating ? (
                                        <span className="text-muted-foreground">Creating...</span>
                                      ) : (
                                        <span className="flex items-center gap-2">
                                          <span>+</span>
                                          <span>Create &quot;{trimmedInput}&quot;</span>
                                        </span>
                                      )}
                                    </button>
                                  )}
                                  {filteredClients.length === 0 && !showCreateOption && (
                                    <div className="px-3 py-2 text-sm text-muted-foreground">
                                      No clients found
                                    </div>
                                  )}
                                  </div>
                                </DropdownPositioner>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="pt-2">
                <Button 
                  onClick={handleImport}
                  disabled={loading || importing || selectedCount === 0}
                  className="w-full"
                  size="lg"
                >
                  {importing ? 'Importing...' : `Import ${selectedCount} Session${selectedCount !== 1 ? 's' : ''}`}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

