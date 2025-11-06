'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ReminderSettings() {
  const [reminderSettings, setReminderSettings] = useState({
    phone_number: '',
    reminder_enabled: false,
    reminder_time: '17:00',
    reminder_message_template: '',
    reminder_api_key: ''
  })
  const [showGuide, setShowGuide] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')

  // Load settings on mount
  useEffect(() => {
    fetch('/api/reminders/settings')
      .then(res => res.json())
      .then(({ data }) => {
        if (data) {
          setReminderSettings({
            phone_number: data.phone_number || '',
            reminder_enabled: data.reminder_enabled || false,
            reminder_time: data.reminder_time || '17:00',
            reminder_message_template: data.reminder_message_template || 'Hey {clientName}, looking forward to our session tomorrow at {sessionTime}.',
            reminder_api_key: data.reminder_api_key || ''
          })
        }
      })
      .catch(() => {
        setSaveMessage('Failed to load settings')
      })
  }, [])

  // Save settings
  const saveReminderSettings = async () => {
    setIsSaving(true)
    setSaveMessage('')
    
    try {
      await fetch('/api/reminders/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reminderSettings)
      })
      
      // Reload to get API key
      const res = await fetch('/api/reminders/settings')
      const { data } = await res.json()
      setReminderSettings(prev => ({ 
        ...prev, 
        reminder_api_key: data.reminder_api_key || prev.reminder_api_key 
      }))
      
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  const formatTimeDisplay = (time24: string): string => {
    const [hours, minutes] = time24.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const hour12 = hour % 12 || 12
    return `${hour12}:${minutes} ${ampm}`
  }

  const timeOptions = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30',
    '20:00', '20:30', '21:00', '21:30', '22:00'
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Your Phone Number</Label>
          <Input
            type="tel"
            value={reminderSettings.phone_number}
            onChange={(e) => setReminderSettings({ ...reminderSettings, phone_number: e.target.value })}
            placeholder="(555) 123-4567"
          />
          <p className="text-xs text-muted-foreground">
            Optional: Used to identify you in the system
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="reminder-enabled"
            checked={reminderSettings.reminder_enabled}
            onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_enabled: e.target.checked })}
            className="w-4 h-4 cursor-pointer"
          />
          <Label htmlFor="reminder-enabled" className="cursor-pointer">Enable automatic reminders</Label>
        </div>
        
        {reminderSettings.reminder_enabled && (
          <>
            <div className="space-y-2">
              <Label>Send reminders at</Label>
              <select
                value={reminderSettings.reminder_time}
                onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_time: e.target.value })}
                className="w-full px-3 py-2 border rounded-md bg-background"
              >
                {timeOptions.map(time => (
                  <option key={time} value={time}>
                    {formatTimeDisplay(time)}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Reminders will be sent the day before each session
              </p>
            </div>
            
            <div className="space-y-2">
              <Label>Message template</Label>
              <Textarea
                value={reminderSettings.reminder_message_template}
                onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_message_template: e.target.value })}
                rows={3}
                placeholder="Use {clientName} and {sessionTime}"
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Variables: <code className="bg-muted px-1 rounded">{'{clientName}'}</code> <code className="bg-muted px-1 rounded">{'{sessionTime}'}</code>
              </p>
            </div>
          </>
        )}
        
        <div className="flex items-center gap-3">
          <Button onClick={saveReminderSettings} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Reminder Settings'}
          </Button>
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>
        
        {reminderSettings.reminder_enabled && reminderSettings.reminder_api_key && (
          <div className="mt-4 p-4 bg-muted rounded-lg space-y-3">
            <p className="text-sm font-medium">iPhone Setup Required</p>
            <p className="text-sm text-muted-foreground">
              To complete the setup, open the detailed setup guide on your iPhone and follow the step-by-step instructions.
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={() => window.open('/account/reminders-setup', '_blank')} 
                size="sm"
              >
                Open Setup Guide (iPhone)
              </Button>
              <Button variant="outline" onClick={() => setShowGuide(!showGuide)} size="sm">
                {showGuide ? 'Hide' : 'Show'} Quick Guide
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Opens a simple 4-step guide. Keep it open on your iPhone while setting up in Shortcuts app (~3 minutes).
            </p>
          </div>
        )}
        
        {showGuide && (
          <div className="mt-4 p-4 border rounded-lg space-y-3 bg-background">
            <h4 className="font-medium">Quick Setup Overview</h4>
            <p className="text-sm text-muted-foreground">
              For detailed step-by-step instructions, open the full setup guide on your iPhone.
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Open <strong>&quot;Open Setup Guide (iPhone)&quot;</strong> button above on your iPhone</li>
              <li>Follow the 9-step guide to create the shortcut manually</li>
              <li>Create a daily automation at <strong>{formatTimeDisplay(reminderSettings.reminder_time)}</strong></li>
              <li>Turn OFF &quot;Ask Before Running&quot; for full automation</li>
            </ol>
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-900 dark:text-blue-100">
                <strong>Note:</strong> iOS doesn&apos;t allow importing shortcut files directly. 
                You&apos;ll need to create the shortcut manually following the detailed guide.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

