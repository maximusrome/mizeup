'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
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
import { getClients, createClient, createSession, createRecurringSessions, updateSessionWithScope, deleteSession, deleteSessionWithScope, deleteFutureSessions } from '@/lib/api'
import type { Client, Session } from '@/types'

// Constants
const DROPDOWN_CLOSE_DELAY = 200 // ms
const CLIENT_NAME_MAX_LENGTH = 100
const TIME_STEP = 900 // seconds (15 minutes)
type BackendRecurrenceFrequency = 'weekly' | 'biweekly' | 'every4weeks'
type RecurrenceFrequency = 'one-time' | BackendRecurrenceFrequency

const recurrenceOptions: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'one-time', label: 'One Time' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every 2 Weeks' },
  { value: 'every4weeks', label: 'Every 4 Weeks' },
]

const isRecurringFrequencyValue = (
  value?: RecurrenceFrequency | null
): value is BackendRecurrenceFrequency => !!value && value !== 'one-time'

const sessionSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(CLIENT_NAME_MAX_LENGTH, 'Client name is too long'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  date: z.string().min(1, 'Date is required'),
  // Recurring fields
  recurringFrequency: z.string().optional(),
  recurringEndDate: z.string().optional(),
}).refine(data => {
  // Validate end time is after start time
  if (data.startTime && data.endTime) {
    return data.endTime > data.startTime
  }
  return true
}, {
  message: 'End time must be after start time',
  path: ['endTime']
})

type SessionFormData = z.infer<typeof sessionSchema>

interface SessionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string
  selectedTime?: string
  editingSession?: Session | null
  onSave: (session: Session) => void
  onSaveMultiple?: (sessions: Session[]) => void
  onBulkDelete?: () => void
}

export default function SessionModal({ 
  isOpen, 
  onClose, 
  selectedDate,
  selectedTime = '',
  editingSession, 
  onSave,
  onSaveMultiple,
  onBulkDelete
}: SessionModalProps) {
  const router = useRouter()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreatingClient, setIsCreatingClient] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [activeClientIndex, setActiveClientIndex] = useState(0)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [showUpdateScopeDialog, setShowUpdateScopeDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState<'single' | 'all_future' | null>(null)
  const isCreatingClientRef = useRef(false)
  const clientNameInputRef = useRef<HTMLInputElement>(null)
  type SessionData = {
    client_id: string
    date: string
    start_time: string
    end_time: string
    recurring_frequency?: BackendRecurrenceFrequency
    recurring_end_date?: string
  }
  
  const [pendingSessionData, setPendingSessionData] = useState<SessionData | null>(null)

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      clientName: '',
      startTime: '13:00',
      endTime: '14:00',
      date: selectedDate,
      recurringFrequency: 'one-time',
      recurringEndDate: '',
    },
  })

  // Load clients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadClients()
    }
  }, [isOpen])

  // Set form values when modal opens / editing changes
  useEffect(() => {
    if (!isOpen) return

    if (editingSession) {
      form.reset({
        clientName: editingSession.clients?.name || '',
        startTime: editingSession.start_time,
        endTime: editingSession.end_time,
        date: editingSession.date,
        recurringFrequency: editingSession.recurring_frequency || 'one-time',
        recurringEndDate: editingSession.recurring_end_date || '',
      })
      const editingClientName = editingSession.clients?.name || ''
      if (editingClientName) {
        setSelectedClientId(editingSession.client_id)
      }
    } else {
      const startTime = selectedTime || '13:00'
      const [hours, minutes] = startTime.split(':').map(Number)
      const endHour = (hours + 1) % 24
      const endTime = `${endHour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
      
      form.reset({
        clientName: '',
        startTime,
        endTime,
        date: selectedDate,
        recurringFrequency: 'one-time',
        recurringEndDate: '',
      })
      setSelectedClientId(null)
      setActiveClientIndex(0)
    }
  }, [isOpen, editingSession, selectedDate, selectedTime, form])

  const loadClients = async () => {
    try {
      const clientsData = await getClients()
      setClients(clientsData)
    } catch {
      // Silently handle client loading errors
    }
  }

  const capitalizeName = (name: string): string => {
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  }

  const handleCreateClient = async (name: string) => {
    const trimmedName = name.trim()
    if (!trimmedName || isCreatingClientRef.current) return

    try {
      setIsCreatingClient(true)
      isCreatingClientRef.current = true
      setShowClientDropdown(false)
      clientNameInputRef.current?.blur()
      const capitalizedName = capitalizeName(trimmedName)
      const newClient = await createClient({ name: capitalizedName })
      setClients(prev => [...prev, newClient])
      setSelectedClientId(newClient.id)
      form.setValue('clientName', newClient.name, { shouldDirty: true, shouldValidate: true })
      form.clearErrors('clientName')
    } catch (error) {
      form.setError('clientName', { 
        type: 'manual', 
        message: error instanceof Error ? error.message : 'Failed to create client' 
      })
      setShowClientDropdown(true)
    } finally {
      setIsCreatingClient(false)
      isCreatingClientRef.current = false
    }
  }

  const clientNameRaw = form.watch('clientName') || ''
  const clientNameValue = clientNameRaw.toLowerCase()
  const frequencyValue =
    (form.watch('recurringFrequency') as RecurrenceFrequency | undefined) || 'one-time'
  const isRecurringSelected = frequencyValue !== 'one-time'

  // Filter clients based on input
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientNameValue)
  )

  // Determine if we should show "Create new" option
  const trimmedInput = clientNameRaw.trim()
  const trimmedInputLower = trimmedInput.toLowerCase()
  const hasExactMatch = clients.some(
    client => client.name.toLowerCase() === trimmedInputLower
  )
  const showCreateOption = trimmedInput.length > 0 && !hasExactMatch && !isCreatingClient
  const totalOptions = filteredClients.length + (showCreateOption ? 1 : 0)

  // Auto-match when clients list updates (e.g., after creating new client)
  useEffect(() => {
    const currentName = form.watch('clientName') || ''
    if (!currentName.trim()) {
      return
    }

    const match = clients.find(
      client => client.name.toLowerCase() === currentName.trim().toLowerCase()
    )

    if (match) {
      setSelectedClientId(match.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients])

  useEffect(() => {
    if (!showClientDropdown) return
    setActiveClientIndex(0)
  }, [clientNameValue, showClientDropdown, totalOptions])


  // Helper function to handle session conversion scenarios
  // Returns true if the update completed immediately, false if awaiting scope selection
  const handleSessionConversion = async (
    sessionData: SessionData,
    newIsRecurring: boolean
  ): Promise<boolean> => {
    if (!editingSession) return true
    
    const wasRecurring = !!editingSession.recurring_group_id
    const isConvertingToRecurring = !wasRecurring && newIsRecurring
    const isConvertingFromRecurring = wasRecurring && !newIsRecurring
    const isAlreadyRecurring = wasRecurring && newIsRecurring

    if (isConvertingFromRecurring) {
      // Converting from recurring to non-recurring
      // First delete all future sessions in the recurring group
      await deleteFutureSessions(editingSession.id)
      
      // Then update this session to remove recurring metadata
      await updateSessionWithScope(editingSession.id, {
        client_id: sessionData.client_id,
        date: sessionData.date,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        update_scope: 'single',
        recurring_frequency: undefined,
        recurring_end_date: undefined,
        recurring_group_id: undefined
      })
      
      // Use bulk delete to refetch and show the updated state
      // (this handles the deletion of future sessions cleanly)
      if (onBulkDelete) {
        onBulkDelete()
      }
    } else if (isAlreadyRecurring) {
      // Show scope selection dialog for existing recurring sessions
      setPendingSessionData(sessionData)
      setShowUpdateScopeDialog(true)
      return false
    } else if (isConvertingToRecurring) {
      // Converting non-recurring to recurring
      // Delete the original single session first
      await deleteSession(editingSession.id)
      
      // Create new recurring sessions starting from the session's date
      const recurringSessionData = {
        client_id: sessionData.client_id,
        date: sessionData.date,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        is_recurring: true,
        recurring_frequency: sessionData.recurring_frequency,
        recurring_end_date: sessionData.recurring_end_date
      }
      
      const sessions = await createRecurringSessions(recurringSessionData)
      
      // Always use onSaveMultiple for conversions to properly replace the deleted session
      if (sessions.length > 0) {
        if (onSaveMultiple) {
          onSaveMultiple(sessions)
        } else {
          onSave(sessions[0])
        }
      }
    } else {
      // Regular non-recurring session update
      const sessions = await updateSessionWithScope(editingSession.id, {
        client_id: sessionData.client_id,
        date: sessionData.date,
        start_time: sessionData.start_time,
        end_time: sessionData.end_time,
        update_scope: 'single'
      })
      onSave(sessions[0])
    }
    return true
  }

  const onSubmit = async (data: SessionFormData) => {
    // Validate recurring fields only if recurring is enabled
    const currentFrequency = form.getValues('recurringFrequency') as RecurrenceFrequency | undefined
    const currentEndDate = form.getValues('recurringEndDate')
    const isRecurring = isRecurringFrequencyValue(currentFrequency)

    if (isRecurring) {
      if (!currentFrequency || !currentEndDate) {
        alert('Please select both frequency and end date for recurring sessions')
        return
      }
      
      // Validate recurring end date is after or equal to start date
      if (currentEndDate < data.date) {
        alert('Recurring end date must be after or equal to the start date')
        return
      }
    }
    
    try {
      setIsLoading(true)
      
      // Require existing client selection
      const client = selectedClientId
        ? clients.find(c => c.id === selectedClientId)
        : clients.find(
            c => c.name.toLowerCase() === data.clientName.trim().toLowerCase()
          )

      if (!client) {
        form.setError('clientName', { type: 'manual', message: 'Select an existing client or add a new one' })
        setShowClientDropdown(true)
        setIsLoading(false)
        return
      }

      const sessionData: SessionData & { is_recurring?: boolean } = {
        client_id: client.id,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
      }

      if (isRecurring && currentFrequency) {
        sessionData.is_recurring = true
        sessionData.recurring_frequency = currentFrequency
        sessionData.recurring_end_date = currentEndDate
      }

      if (editingSession) {
        const completed = await handleSessionConversion(sessionData, !!sessionData.is_recurring)
        if (!completed) {
          // Awaiting user scope selection, do not close modal here
          setIsLoading(false)
          return
        }
      } else {
        // Creating new session(s)
        if (sessionData.is_recurring && sessionData.recurring_end_date) {
          // Creating recurring sessions - returns array
          const sessions = await createRecurringSessions(sessionData)
          if (sessions.length === 0) return
          
          if (sessions.length === 1) {
            onSave(sessions[0])
          } else if (onSaveMultiple) {
            onSaveMultiple(sessions)
          } else {
            // Fallback: save them one by one
            sessions.forEach(s => onSave(s))
          }
        } else {
          // Creating single non-recurring session
          const session = await createSession(sessionData)
          onSave(session)
        }
      }

      onClose()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save session'
      alert(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateScope = async (scope: 'single' | 'all_future') => {
    if (!editingSession || !pendingSessionData) return
    
    try {
      setIsLoading(true)
      
      // Build update data with explicit fields
      const updateData: SessionData & { update_scope: 'single' | 'all_future' } = {
        client_id: pendingSessionData.client_id,
        date: pendingSessionData.date,
        start_time: pendingSessionData.start_time,
        end_time: pendingSessionData.end_time,
        update_scope: scope,
      }
      
      // Include recurring fields if the session is recurring
      const updateFrequency = form.getValues('recurringFrequency') as RecurrenceFrequency | undefined
      if (isRecurringFrequencyValue(updateFrequency)) {
        updateData.recurring_frequency = updateFrequency
        updateData.recurring_end_date = form.getValues('recurringEndDate')
      } else {
        updateData.recurring_frequency = undefined
        updateData.recurring_end_date = undefined
      }
      
      const sessions = await updateSessionWithScope(editingSession.id, updateData)
      
      if (onSaveMultiple && sessions.length > 1) {
        onSaveMultiple(sessions)
      } else if (sessions.length > 0) {
        onSave(sessions[0])
      }
      
      // If applying to all future, the backend may delete and recreate sessions.
      // Trigger a refetch so the calendar reflects removals and new spacing.
      if (scope === 'all_future' && onBulkDelete) {
        onBulkDelete()
      }
      
      setShowUpdateScopeDialog(false)
      setPendingSessionData(null)
      onClose()
    } catch {
      alert('Failed to update session. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (scope: 'single' | 'all_future') => {
    if (!editingSession) return
    
    try {
      setIsDeleting(scope)
      if (editingSession.recurring_group_id) {
        await deleteSessionWithScope(editingSession.id, scope)
      } else {
        await deleteSession(editingSession.id)
      }
      
      if (onBulkDelete) {
        onBulkDelete()
      }
      
      setShowDeleteDialog(false)
      onClose()
    } catch {
      alert('Failed to delete session. Please try again.')
    } finally {
      setIsDeleting(null)
    }
  }

  if (!isOpen) return null

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card 
        className="w-full max-w-md animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{editingSession ? 'Update Session' : 'Add Session'}</CardTitle>
            <div className="flex items-center gap-1">
              {editingSession && (() => {
                const isPastSession = (() => {
                  try {
                    const sessionStart = new Date(`${editingSession.date}T${editingSession.start_time}`)
                    return sessionStart.getTime() < Date.now()
                  } catch {
                    return false
                  }
                })()
                
                return (
                  <>
                    {isPastSession && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (!editingSession.synced_to_therapynotes) {
                            alert('Please sync this session before creating a progress note.')
                            return
                          }
                          router.push(`/notes/${editingSession.id}`)
                        }}
                        className={`h-8 w-8 p-0 transition-colors ${
                          editingSession.has_progress_note
                            ? 'text-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                        title={editingSession.has_progress_note ? 'Progress note available' : 'Progress note'}
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (editingSession.recurring_group_id) {
                          setShowDeleteDialog(true)
                        } else {
                          handleDelete('single')
                        }
                      }}
                      disabled={isDeleting !== null}
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      title="Delete session"
                    >
                      {isDeleting !== null ? (
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </Button>
                  </>
                )
              })()}
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground h-10 w-10 p-0 rounded-full text-lg"
              >
                ×
              </Button>
            </div>
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
                      <div className="relative">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input 
                              placeholder="Enter client name"
                              {...field}
                              ref={(e) => {
                                field.ref(e)
                                clientNameInputRef.current = e
                              }}
                              onFocus={() => {
                                setShowClientDropdown(true)
                              }}
                              onBlur={() => setTimeout(() => {
                                if (isCreatingClientRef.current) return
                                setShowClientDropdown(false)
                                const trimmedValue = (form.getValues('clientName') || '').trim()
                                
                                // Only normalize if exact match exists
                                if (trimmedValue) {
                                  const match = clients.find(
                                    client => client.name.toLowerCase() === trimmedValue.toLowerCase()
                                  )
                                  if (match) {
                                    setSelectedClientId(match.id)
                                    form.setValue('clientName', match.name, { shouldDirty: true, shouldValidate: true })
                                  }
                                }
                              }, DROPDOWN_CLOSE_DELAY)}
                              onChange={(event) => {
                                const value = event.target.value
                                field.onChange(value)
                                setShowClientDropdown(true)
                                form.clearErrors('clientName')

                                if (!value.trim()) {
                                  setSelectedClientId(null)
                                } else {
                                  const match = clients.find(
                                    client => client.name.toLowerCase() === value.trim().toLowerCase()
                                  )
                                  if (match) {
                                    setSelectedClientId(match.id)
                                  } else {
                                    setSelectedClientId(null)
                                  }
                                }
                              }}
                              onKeyDown={(event) => {
                                if (totalOptions === 0) return

                                if (event.key === 'ArrowDown') {
                                  event.preventDefault()
                                  setShowClientDropdown(true)
                                  setActiveClientIndex(prev => (prev + 1) % totalOptions)
                                } else if (event.key === 'ArrowUp') {
                                  event.preventDefault()
                                  setShowClientDropdown(true)
                                  setActiveClientIndex(prev => (prev - 1 + totalOptions) % totalOptions)
                                } else if (event.key === 'Enter') {
                                  if (!showClientDropdown) return
                                  event.preventDefault()
                                  const isCreateOption = showCreateOption && activeClientIndex === filteredClients.length
                                  if (isCreateOption && trimmedInput) {
                                    handleCreateClient(trimmedInput)
                                  } else {
                                    const client = filteredClients[activeClientIndex]
                                    if (client) {
                                      field.onChange(client.name)
                                      setSelectedClientId(client.id)
                                      form.clearErrors('clientName')
                                      setShowClientDropdown(false)
                                      clientNameInputRef.current?.blur()
                                    }
                                  }
                                } else if (event.key === 'Escape') {
                                  setShowClientDropdown(false)
                                }
                              }}
                              autoComplete="off"
                            />
                            {showClientDropdown && (
                              <div className="absolute z-10 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                                {filteredClients.length > 0 && filteredClients.map((client, index) => (
                                  <button
                                    key={client.id}
                                    type="button"
                                    className={`w-full px-3 py-2 text-left focus:outline-none border-b border-border ${
                                      index === activeClientIndex
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted focus:bg-muted'
                                    }`}
                                    onMouseEnter={() => setActiveClientIndex(index)}
                                    onClick={() => {
                                      field.onChange(client.name)
                                      setSelectedClientId(client.id)
                                      form.clearErrors('clientName')
                                      setShowClientDropdown(false)
                                      clientNameInputRef.current?.blur()
                                    }}
                                  >
                                    {client.name}
                                  </button>
                                ))}
                                {showCreateOption && (
                                  <button
                                    type="button"
                                    className={`w-full px-3 py-2 text-left focus:outline-none border-t border-border ${
                                      activeClientIndex === filteredClients.length
                                        ? 'bg-primary/10 text-primary'
                                        : 'hover:bg-muted focus:bg-muted'
                                    }`}
                                    onMouseEnter={() => setActiveClientIndex(filteredClients.length)}
                                    onMouseDown={(e) => {
                                      e.preventDefault()
                                      handleCreateClient(trimmedInput)
                                    }}
                                    disabled={isCreatingClient}
                                  >
                                    {isCreatingClient ? (
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
                            )}
                          </div>
                        </div>
                      </div>
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
                          step={TIME_STEP.toString()}
                          onChange={(e) => {
                            const startTime = e.target.value
                            field.onChange(startTime)
                            // Auto-set end time to 1 hour later
                            if (startTime) {
                              const [hours, minutes] = startTime.split(':').map(Number)
                              const endHours = (hours + 1) % 24
                              const endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
                              form.setValue('endTime', endTime)
                            }
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
                          step={TIME_STEP.toString()}
                          className="text-center"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Recurring Options */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-end gap-4">
                  <div className="flex-1">
                    <label htmlFor="recurringFrequency" className="text-sm font-medium">Frequency</label>
                    <select
                      id="recurringFrequency"
                      value={frequencyValue}
                      onChange={(e) => {
                        const newFrequency = e.target.value as RecurrenceFrequency
                        form.setValue('recurringFrequency', newFrequency, { shouldDirty: true })
                        if (newFrequency === 'one-time') {
                          form.setValue('recurringEndDate', '', { shouldDirty: true })
                        } else if (!form.getValues('recurringEndDate')) {
                          const selectedDateValue = form.getValues('date')
                          if (selectedDateValue) {
                            const defaultEndDate = new Date(selectedDateValue)
                            defaultEndDate.setMonth(defaultEndDate.getMonth() + 3)
                            form.setValue(
                              'recurringEndDate',
                              defaultEndDate.toISOString().split('T')[0],
                              { shouldDirty: true }
                            )
                          }
                        }
                      }}
                      className="w-full h-9 px-3 border border-input rounded-md mt-1 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      {recurrenceOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {isRecurringSelected && (
                    <div className="sm:w-48">
                      <label htmlFor="recurringEndDate" className="text-sm font-medium">Until</label>
                      <Input
                        id="recurringEndDate"
                        type="date"
                        min={form.watch('date')}
                        value={form.watch('recurringEndDate')}
                        onChange={(e) => form.setValue('recurringEndDate', e.target.value)}
                        className="mt-1"
                      />
                      {form.formState.errors.recurringEndDate && (
                        <p className="text-sm text-destructive mt-1">
                          {form.formState.errors.recurringEndDate.message}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="pt-2">
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading 
                    ? (editingSession ? 'Updating...' : 'Adding...') 
                    : (editingSession ? 'Update' : 'Add')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {/* Update Scope Dialog */}
      {showUpdateScopeDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
          onClick={() => setShowUpdateScopeDialog(false)}
        >
          <Card 
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Update Session</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowUpdateScopeDialog(false)}
                  className="text-muted-foreground hover:text-foreground h-10 w-10 p-0 rounded-full text-lg"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This is a recurring session. What would you like to update?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleUpdateScope('single')}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'This Session Only'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleUpdateScope('all_future')}
                  className="flex-1"
                  disabled={isLoading}
                >
                  {isLoading ? 'Updating...' : 'All Future Sessions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]"
          onClick={() => setShowDeleteDialog(false)}
        >
          <Card 
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Delete Session</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(false)}
                  className="text-muted-foreground hover:text-foreground h-10 w-10 p-0 rounded-full text-lg"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This is a recurring session. What would you like to delete?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDelete('single')}
                  className="flex-1"
                  disabled={isDeleting !== null}
                >
                  {isDeleting === 'single' ? 'Deleting...' : 'This Session Only'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete('all_future')}
                  className="flex-1"
                  disabled={isDeleting !== null}
                >
                  {isDeleting === 'all_future' ? 'Deleting...' : 'All Future Sessions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

