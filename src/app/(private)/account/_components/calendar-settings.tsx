'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { connectCalendar } from '@/lib/api'

export default function CalendarSettings() {
  const [icalUrl, setIcalUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [showHelp, setShowHelp] = useState(false)

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/calendar?settings=true')
        if (response.ok) {
          const data = await response.json()
          if (data.ical_feed_url) {
            setIcalUrl(data.ical_feed_url)
          }
        }
      } catch {
        // Silently fail
      }
    }
    loadSettings()
  }, [])

  const handleSave = async () => {
    if (!icalUrl.trim()) {
      setSaveMessage('iCal URL cannot be empty')
      setTimeout(() => setSaveMessage(''), 3000)
      return
    }

    setSaving(true)
    setSaveMessage('')

    try {
      await connectCalendar(icalUrl)
      setSaveMessage('Calendar connected successfully')
      setTimeout(() => setSaveMessage(''), 3000)
    } catch {
      setSaveMessage('Failed to connect calendar. Please check your URL.')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendar Import</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="ical-url">iCal Feed URL</Label>
          <Input
            id="ical-url"
            type="text"
            placeholder="webcal://..."
            value={icalUrl}
            onChange={(e) => setIcalUrl(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Calendar URL'}
          </Button>
          {saveMessage && (
            <span className={`text-sm ${saveMessage.includes('Failed') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="w-full flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
        >
          <span className="text-sm font-medium">How to get your iCal URL</span>
          <span className={`transition-transform ${showHelp ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showHelp && (
          <div className="p-4 border rounded-lg space-y-4 bg-background">
            <div>
              <h3 className="text-sm font-semibold mb-2">Apple Calendar</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">1.</span>
                  <span>Right-click your calendar → Share Calendar</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">2.</span>
                  <span>Check Public Calendar → Copy URL</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">3.</span>
                  <span>Paste URL here</span>
                </li>
              </ol>
            </div>
            <div>
              <h3 className="text-sm font-semibold mb-2">Google Calendar</h3>
              <ol className="space-y-2 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">1.</span>
                  <span>Go to Settings → Integrate calendar</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">2.</span>
                  <span>Copy Secret address in iCal format</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-foreground">3.</span>
                  <span>Paste URL here</span>
                </li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

