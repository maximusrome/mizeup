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
import { getClients, createClient, createSession, updateSession } from '@/lib/api'
import type { Client, Session } from '@/types'

const sessionSchema = z.object({
  clientName: z.string().min(1, 'Client name is required').max(100, 'Client name is too long'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  date: z.string().min(1, 'Date is required'),
})

type SessionFormData = z.infer<typeof sessionSchema>

interface SessionModalProps {
  isOpen: boolean
  onClose: () => void
  selectedDate: string
  editingSession?: Session | null
  onSave: (session: Session) => void
}

export default function SessionModal({ 
  isOpen, 
  onClose, 
  selectedDate, 
  editingSession, 
  onSave 
}: SessionModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const form = useForm<SessionFormData>({
    resolver: zodResolver(sessionSchema),
    defaultValues: {
      clientName: '',
      startTime: '',
      endTime: '',
      date: selectedDate,
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
      })
    } else {
      form.reset({
        clientName: '',
        startTime: '',
        endTime: '',
        date: selectedDate,
      })
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

  const onSubmit = async (data: SessionFormData) => {
    try {
      setIsLoading(true)
      
      // Find existing client or create new one
      let client = clients.find(c => c.name === data.clientName.trim())
      if (!client) {
        client = await createClient({ name: data.clientName.trim() })
        setClients(prev => [...prev, client!])
      }

      // Ensure time format is HH:MM
      const formatTime = (time: string) => {
        if (!time) return ''
        const cleanTime = time.trim()
        
        // If time is already in HH:MM format, return as is
        if (/^\d{2}:\d{2}$/.test(cleanTime)) {
          return cleanTime
        }
        
        // If time is in HH:MM:SS format, extract HH:MM
        if (/^\d{2}:\d{2}:\d{2}$/.test(cleanTime)) {
          return cleanTime.substring(0, 5) // Extract first 5 characters (HH:MM)
        }
        
        // If time is in H:MM format, pad with zero
        if (/^\d{1}:\d{2}$/.test(cleanTime)) {
          return `0${cleanTime}`
        }
        
        return cleanTime
      }

      const sessionData = {
        client_id: client.id,
        date: data.date,
        start_time: formatTime(data.startTime),
        end_time: formatTime(data.endTime),
      }

      if (editingSession) {
        const updatedSession = await updateSession(editingSession.id, sessionData)
        onSave(updatedSession)
      } else {
        const newSession = await createSession(sessionData)
        onSave(newSession)
      }

      onClose()
    } catch (error) {
      console.error('Error saving session:', error)
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
            <CardTitle>{editingSession ? 'Edit Session' : 'Add Session'}</CardTitle>
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
                          autoFocus 
                          onFocus={() => setShowClientDropdown(true)}
                          onBlur={() => setTimeout(() => setShowClientDropdown(false), 200)}
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
                          step="900"
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
                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : (editingSession ? 'Update' : 'Add')}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  )
}

