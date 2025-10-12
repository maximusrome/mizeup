'use client'

import { useState, useEffect } from 'react'
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
import { getClients, createClient, createSession, createRecurringSessions, updateSessionWithScope, deleteSession, deleteFutureSessions } from '@/lib/api'
import type { Client, Session } from '@/types'

// Constants
const DROPDOWN_CLOSE_DELAY = 200 // ms
const CLIENT_NAME_MAX_LENGTH = 100
const TIME_STEP = 900 // seconds (15 minutes)

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
  editingSession?: Session | null
  onSave: (session: Session) => void
  onSaveMultiple?: (sessions: Session[]) => void
  onBulkDelete?: () => void
}

export default function SessionModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  editingSession, 
  onSave,
  onSaveMultiple,
  onBulkDelete
}: SessionModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)
  const [isRecurring, setIsRecurring] = useState(false)
  const [showUpdateScopeDialog, setShowUpdateScopeDialog] = useState(false)
  type SessionData = {
    client_id: string
    date: string
    start_time: string
    end_time: string
    recurring_frequency?: 'weekly' | 'biweekly' | 'every4weeks'
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
      recurringFrequency: undefined,
      recurringEndDate: '',
    },
  })

  // Load clients when modal opens
  useEffect(() => {
    if (isOpen) {
      loadClients()
    }
  }, [isOpen])

  // Set form values when editing
  useEffect(() => {
    if (editingSession) {
      form.reset({
        clientName: editingSession.clients?.name || '',
        startTime: editingSession.start_time,
        endTime: editingSession.end_time,
        date: editingSession.date,
        recurringFrequency: editingSession.recurring_frequency || undefined,
        recurringEndDate: editingSession.recurring_end_date || '',
      })
      setIsRecurring(!!editingSession.recurring_group_id)
    } else {
      form.reset({
        clientName: '',
        startTime: '13:00',
        endTime: '14:00',
        date: selectedDate,
        recurringFrequency: undefined,
        recurringEndDate: '',
      })
      setIsRecurring(false)
    }
  }, [editingSession, selectedDate, form])

  const loadClients = async () => {
    try {
      const clientsData = await getClients()
      setClients(clientsData)
    } catch (error) {
      console.error('Error loading clients:', error)
    }
  }

  // Filter clients based on input
  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(form.watch('clientName')?.toLowerCase() || '')
  )


  // Helper function to handle session conversion scenarios
  // Returns true if the update completed immediately, false if awaiting scope selection
  const handleSessionConversion = async (sessionData: SessionData): Promise<boolean> => {
    if (!editingSession) return true
    
    const isConvertingToRecurring = !editingSession.recurring_group_id && isRecurring
    const isConvertingFromRecurring = editingSession.recurring_group_id && !isRecurring
    const isAlreadyRecurring = editingSession.recurring_group_id && isRecurring

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
    if (isRecurring) {
      const currentFrequency = form.getValues('recurringFrequency')
      const currentEndDate = form.getValues('recurringEndDate')
      
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
      
      // Find existing client or create new one
      let client = clients.find(c => c.name === data.clientName.trim())
      if (!client) {
        client = await createClient({ name: data.clientName.trim() })
        setClients(prev => [...prev, client!])
      }

      const sessionData: SessionData & { is_recurring?: boolean } = {
        client_id: client.id,
        date: data.date,
        start_time: data.startTime,
        end_time: data.endTime,
        ...(isRecurring && {
          is_recurring: true,
          recurring_frequency: form.getValues('recurringFrequency') as 'weekly' | 'biweekly' | 'every4weeks',
          recurring_end_date: form.getValues('recurringEndDate'),
        })
      }

      if (editingSession) {
        const completed = await handleSessionConversion(sessionData)
        if (!completed) {
          // Awaiting user scope selection, do not close modal here
          setIsLoading(false)
          return
        }
      } else {
        // Creating new session(s)
        if (isRecurring && sessionData.recurring_end_date) {
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
      console.error('Error saving session:', error)
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
      if (isRecurring) {
        updateData.recurring_frequency = form.getValues('recurringFrequency') as 'weekly' | 'biweekly' | 'every4weeks'
        updateData.recurring_end_date = form.getValues('recurringEndDate')
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
    } catch (error) {
      console.error('Error updating session:', error)
      alert('Failed to update session. Please try again.')
    } finally {
      setIsLoading(false)
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
                        <Input 
                          placeholder="Enter client name" 
                          {...field} 
                          onFocus={() => setShowClientDropdown(true)}
                          onBlur={() => setTimeout(() => setShowClientDropdown(false), DROPDOWN_CLOSE_DELAY)}
                        />
                        {showClientDropdown && filteredClients.length > 0 && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {filteredClients.map(client => (
                              <button
                                key={client.id}
                                type="button"
                                className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none border-b border-gray-100 last:border-b-0"
                                onClick={() => {
                                  field.onChange(client.name)
                                  setShowClientDropdown(false)
                                }}
                              >
                                {client.name}
                              </button>
                            ))}
                          </div>
                        )}
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
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isRecurring"
                    checked={isRecurring}
                    onChange={(e) => {
                      setIsRecurring(e.target.checked)
                      // Set default frequency when recurring is enabled
                      if (e.target.checked && !form.getValues('recurringFrequency')) {
                        form.setValue('recurringFrequency', 'weekly')
                      }
                      // Set default end date to 3 months from selected date
                      if (e.target.checked && !form.getValues('recurringEndDate')) {
                        const selectedDate = form.getValues('date')
                        const threeMonthsLater = new Date(selectedDate)
                        threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3)
                        form.setValue('recurringEndDate', threeMonthsLater.toISOString().split('T')[0])
                      }
                    }}
                    className="rounded border-gray-300"
                  />
                  <label htmlFor="isRecurring" className="text-sm font-medium">
                    Make this a recurring session
                  </label>
                </div>
                
                {isRecurring && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="recurringFrequency" className="text-sm font-medium">Repeat every</label>
                      <select 
                        id="recurringFrequency"
                        value={form.watch('recurringFrequency') || ''} 
                        onChange={(e) => form.setValue('recurringFrequency', e.target.value)}
                        className="w-full p-2 border rounded-md mt-1"
                      >
                        <option value="weekly">Week</option>
                        <option value="biweekly">2 Weeks</option>
                        <option value="every4weeks">4 Weeks</option>
                      </select>
                    </div>
                    
                    <div>
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
                  </div>
                )}
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
    </div>
  )
}

