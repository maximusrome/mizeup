'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

export default function ReminderSettings() {
  const [reminderSettings, setReminderSettings] = useState({
    reminder_message_template: '',
    reminder_api_key: ''
  })
  const [showGuide, setShowGuide] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [copied, setCopied] = useState(false)

  // Load settings on mount
  useEffect(() => {
    fetch('/api/reminders/settings')
      .then(res => res.json())
      .then(({ data }) => {
        if (data) {
          setReminderSettings({
            reminder_message_template: data.reminder_message_template || 'Hey {clientName}, looking forward to our session tomorrow at {sessionTime}',
            reminder_api_key: data.reminder_api_key || ''
          })
          if (data.reminder_api_key) {
            setApiUrl(`${window.location.origin}/api/reminders/tomorrow?key=${data.reminder_api_key}`)
          }
        }
      })
      .catch(() => {
        setSaveMessage('Failed to load settings')
      })
  }, [])

  // Save settings
  const saveReminderSettings = async () => {
    // Validate template isn't empty
    if (!reminderSettings.reminder_message_template.trim()) {
      setSaveMessage('Message template cannot be empty')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }
    
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
      
      // Update API URL if we got a new API key
      if (data.reminder_api_key) {
        setApiUrl(`${window.location.origin}/api/reminders/tomorrow?key=${data.reminder_api_key}`)
      }
      
      setSaveMessage('Settings saved successfully!')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Reminders</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Message template</Label>
          <Textarea
            value={reminderSettings.reminder_message_template}
            onChange={(e) => setReminderSettings({ ...reminderSettings, reminder_message_template: e.target.value })}
            rows={3}
            placeholder="Use {clientName} and {sessionTime}"
            className="resize-none"
          />
        </div>
        
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
        
        {reminderSettings.reminder_api_key && (
          <div className="mt-4 space-y-3">
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="w-full flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
            >
              <span className="text-sm font-medium">iPhone Shortcuts Setup</span>
              <span className={`transition-transform ${showGuide ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {showGuide && (
              <div className="p-4 border rounded-lg space-y-4 bg-background">
                {/* Step 1: Copy URL */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">1</span>
                    <p className="text-sm font-medium">Copy Your API URL</p>
                  </div>
                  <div className="ml-8 space-y-2">
                    <div className="flex gap-2">
                      <Input
                        readOnly
                        value={apiUrl}
                        className="font-mono text-xs flex-1 h-8"
                      />
                      <Button
                        size="sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(apiUrl)
                            setCopied(true)
                            setTimeout(() => setCopied(false), 2000)
                          } catch {
                            // Clipboard API failed, ignore
                          }
                        }}
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Open the Shortcuts app on your iPhone, then continue below.
                    </p>
                  </div>
                </div>

                {/* Step 2: Build Shortcut */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">2</span>
                    <p className="text-sm font-medium">Build the Shortcut</p>
                  </div>
                  <div className="ml-8 space-y-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">1. Add &quot;Get Contents of URL&quot;</p>
                      <p className="text-xs text-muted-foreground ml-4">• Paste your API URL</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">2. Add &quot;Repeat with Each&quot;</p>
                      <p className="text-xs text-muted-foreground ml-4">• Link to: <code className="bg-muted px-1 rounded">Contents of URL</code></p>
                    </div>
                    <div className="pl-4 border-l-2 border-muted space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase">Inside the loop:</p>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">3. Add &quot;Get Value for Key&quot;</p>
                        <p className="text-xs text-muted-foreground ml-4">• Input: <code className="bg-muted px-1 rounded">Repeat Item</code></p>
                        <p className="text-xs text-muted-foreground ml-4">• Key: <code className="bg-muted px-1 rounded">phoneNumber</code></p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">4. Add &quot;Get Value for Key&quot;</p>
                        <p className="text-xs text-muted-foreground ml-4">• Input: <code className="bg-muted px-1 rounded">Repeat Item</code></p>
                        <p className="text-xs text-muted-foreground ml-4">• Key: <code className="bg-muted px-1 rounded">message</code></p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">5. Add &quot;Send Message&quot;</p>
                        <p className="text-xs text-muted-foreground ml-4">• Recipients: <code className="bg-muted px-1 rounded">Dictionary Value</code> (phone)</p>
                        <p className="text-xs text-muted-foreground ml-4">• Message: <code className="bg-muted px-1 rounded">Dictionary Value</code> (message)</p>
                        <p className="text-xs text-muted-foreground ml-4">• Turn OFF &quot;Show Compose Sheet&quot;</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 3: Name & Test */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold">3</span>
                    <p className="text-sm font-medium">Name & Test</p>
                  </div>
                  <div className="ml-8 space-y-1">
                    <p className="text-xs text-muted-foreground">• Rename to &quot;MizeUp Reminders&quot;</p>
                    <p className="text-xs text-muted-foreground">• Tap play button (▶️) to test</p>
                  </div>
                </div>

                {/* Step 4: Automation */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold">4</span>
                    <p className="text-sm font-medium">Create Automation (Optional)</p>
                  </div>
                  <div className="ml-8 space-y-1">
                    <p className="text-xs text-muted-foreground">• Go to &quot;Automation&quot; tab → &quot;+&quot; → &quot;Time of Day&quot;</p>
                    <p className="text-xs text-muted-foreground">• Set time → Add &quot;Run Shortcut&quot; → Select &quot;MizeUp Reminders&quot;</p>
                    <p className="text-xs text-muted-foreground">• Turn OFF &quot;Ask Before Running&quot;</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

