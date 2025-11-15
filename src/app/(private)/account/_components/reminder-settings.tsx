'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
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
              <span className="text-sm font-medium">How to automate Session Reminders</span>
              <span className={`transition-transform ${showGuide ? 'rotate-180' : ''}`}>▼</span>
            </button>
            
            {showGuide && (
              <div className="p-4 border rounded-lg space-y-4 bg-background">
                {/* Copy URL Section */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="text-sm font-medium">Copy Your API URL</p>
                  </div>
                  <div className="space-y-2">
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
                  </div>
                </div>

                {/* Step by Step Instructions */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Step by step: How to automate Session Reminders</h3>
                  <ol className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">1.</span>
                      <span>Open shortcuts app on iPhone</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">2.</span>
                      <span>Go to Automations tab and click New Automation</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">3.</span>
                      <span>Set time of day for sending your session reminders</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">4.</span>
                      <span>Click Run immediately (optional toggle notify when Run)</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">5.</span>
                      <span>Click Next</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">6.</span>
                      <span>Click Create New Shortcut</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">7.</span>
                      <span>Search for &apos;Get contents of URL&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">8.</span>
                      <span>Paste in URL from MizeUp</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">9.</span>
                      <span>Search for &apos;Repeat with Each&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">10.</span>
                      <span>Search for &apos;Get Dictionary Value&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">11.</span>
                      <span>Drag it under &apos;Repeat with Each&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">12.</span>
                      <span>Click key and type &apos;phoneNumber&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">13.</span>
                      <span>Search for &apos;Send Message&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">14.</span>
                      <span>Click Recipients and select &apos;Dictionary Value&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">15.</span>
                      <span>Search for &apos;Get Dictionary Value&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">16.</span>
                      <span>Drag it under &apos;Repeat with Each&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">17.</span>
                      <span>Click key and type &apos;message&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">18.</span>
                      <span>Click &apos;Dictionary Value&apos; and select &apos;Repeat Item&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">19.</span>
                      <span>Click Message on the Send Message and select &apos;Dictionary Value&apos;</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">20.</span>
                      <span>Drag Send message under Get Dictionary for message</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground">21.</span>
                      <span>Click the checkmark</span>
                    </li>
                  </ol>
                </div>

                {/* Image Reference */}
                <div>
                  <p className="text-sm font-medium mb-2">Example:</p>
                  <div className="border rounded-lg overflow-hidden bg-muted/50 relative w-full">
                    <Image 
                      src="/shortcuts-example.png" 
                      alt="MizeUp reminder shortcut example showing the workflow steps"
                      width={800}
                      height={600}
                      className="w-full h-auto"
                    />
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

