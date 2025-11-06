'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RemindersSetupPage() {
  const [apiKey, setApiKey] = useState('')
  const [apiUrl, setApiUrl] = useState('')
  const [copied, setCopied] = useState('')

  useEffect(() => {
    // Get settings on mount
    fetch('/api/reminders/settings')
      .then(res => res.json())
      .then(({ data }) => {
        if (data?.reminder_api_key) {
          setApiKey(data.reminder_api_key)
          setApiUrl(`${window.location.origin}/api/reminders/tomorrow?key=${data.reminder_api_key}`)
        }
      })
  }, [])

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
  }

  if (!apiKey) {
    return (
      <div className="container mx-auto px-4 max-w-4xl py-8">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Please enable reminders in your Account settings first.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 max-w-4xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">iPhone Shortcuts Setup</h1>
        <p className="text-muted-foreground mt-2">
          Follow these steps to set up automated session reminders on your iPhone
        </p>
      </div>

      <div className="space-y-6">
        {/* Quick Start */}
        <Card className="border-green-200 bg-green-50 dark:bg-green-950">
          <CardHeader>
            <CardTitle>⚡ Quick Setup (4 Simple Steps)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              This will take about 3 minutes. Keep this page open on your iPhone while you set it up.
            </p>
          </CardContent>
        </Card>

        {/* Step 1: Create Shortcut with URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">1</span>
              Create Shortcut & Add API URL
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">In Shortcuts app:</p>
              <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                <li>Tap <strong>"+"</strong> (top right)</li>
                <li>Tap <strong>"Add Action"</strong></li>
                <li>Search <strong>"Get Contents of URL"</strong> → Select it</li>
              </ol>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-xs font-medium mb-2">Copy this URL and paste it in the "URL" field:</p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={apiUrl}
                  className="font-mono text-xs flex-1"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(apiUrl, 'url')}
                  className="whitespace-nowrap"
                >
                  {copied === 'url' ? '✓ Copied!' : 'Copy'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 2: Convert to Dictionary & Get Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">2</span>
              Convert Response to Dictionary & Get Reminders
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Add these 3 actions in order:</p>
              <div className="space-y-3 pl-4">
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Action 1: Convert Rich Text to Dictionary</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                    <li>Tap <strong>"+"</strong> below "Get Contents of URL"</li>
                    <li>Search <strong>"Get Dictionary from Input"</strong> → Select it</li>
                    <li>Tap the <strong>"Input"</strong> field → Select <strong>"Contents of URL"</strong> (from previous action)</li>
                    <li>This converts the JSON response to a Dictionary format</li>
                  </ol>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Action 2: Get "reminders" array</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                    <li>Tap <strong>"+"</strong> below "Get Dictionary from Input"</li>
                    <li>Search <strong>"Get Dictionary Value"</strong> → Select it</li>
                    <li>Tap the <strong>"Input"</strong> field → Select <strong>"Dictionary"</strong> (from previous action)</li>
                    <li>In the <strong>"Key"</strong> field, type: <code className="bg-background px-1.5 py-0.5 rounded">reminders</code></li>
                  </ol>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-1">Action 3: Loop through reminders</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                    <li>Tap <strong>"+"</strong> below "Get Dictionary Value"</li>
                    <li>Search <strong>"Repeat with Each"</strong> → Select it</li>
                    <li>Tap the <strong>"Input"</strong> field → Tap the variable icon (magic wand) → Select <strong>"Dictionary Value"</strong> (this should be the "reminders" array from Action 2)</li>
                    <li>The loop should now show "Repeat with Each reminder" or "Repeat with Each item in Dictionary Value"</li>
                    <li><strong>⚠️ CRITICAL:</strong> Make sure it's looping over the "Dictionary Value" from Action 2 (the reminders array), NOT "Contents of URL"</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="mt-3 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 rounded text-xs">
              <strong>⚠️ Important:</strong> The "Get Dictionary from Input" step is required because iOS returns Rich Text from URLs. This converts it to a Dictionary so we can extract values.
            </div>
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 rounded-lg">
              <p className="text-sm font-medium mb-2">🐛 Debugging Tip:</p>
              <p className="text-xs text-muted-foreground mb-2">
                To see what's happening, add "Show Notification" actions after key steps:
              </p>
              <ul className="text-xs space-y-1 ml-4 list-disc">
                <li>After "Get Dictionary Value" (reminders): Add "Show Notification" → Shows how many reminders found</li>
                <li>After getting phoneNumber: Add "Show Notification" → Shows the phone number</li>
                <li>After getting message: Add "Show Notification" → Shows the message text</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                This helps you see exactly what data is being passed to "Send Message"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Step 3: Send Messages (Inside Loop) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">3</span>
              Send Messages (Inside the Loop)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground mb-3">
              <strong>Inside the "Repeat with Each" loop</strong>, add these 3 actions in order:
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">📍 Convert Repeat Item to Dictionary (if needed)</p>
                <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                  <li>Tap <strong>"+"</strong> inside the loop</li>
                  <li>Search <strong>"Get Dictionary from Input"</strong> → Select it</li>
                  <li>Tap <strong>"Input"</strong> field → Tap variable icon → Select <strong>"Repeat Item"</strong></li>
                  <li>This converts each reminder item from Rich Text to Dictionary</li>
                </ol>
                <p className="text-xs text-muted-foreground mt-2 italic">Skip this if you're not getting conversion errors</p>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">📍 Get phone number</p>
                <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                  <li>Tap <strong>"+"</strong> below (or after "Get Dictionary from Input" if you added it)</li>
                  <li>Search <strong>"Get Dictionary Value"</strong> → Select it</li>
                  <li>Tap <strong>"Input"</strong> field → Tap variable icon → Select either <strong>"Repeat Item"</strong> OR <strong>"Dictionary"</strong> (from "Get Dictionary from Input" if you added it above)</li>
                  <li>In the <strong>"Key"</strong> field, type: <code className="bg-background px-1.5 py-0.5 rounded">phoneNumber</code></li>
                </ol>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">💬 Get message text</p>
                <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                  <li>Tap <strong>"+"</strong> below the phone number action</li>
                  <li>Search <strong>"Get Dictionary Value"</strong> → Select it</li>
                  <li>Tap <strong>"Input"</strong> field → Tap variable icon → Select the SAME input you used for phone number (either "Repeat Item" OR "Dictionary" from conversion step)</li>
                  <li>In the <strong>"Key"</strong> field, type: <code className="bg-background px-1.5 py-0.5 rounded">message</code></li>
                </ol>
              </div>
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-1">📤 Send message</p>
                <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                  <li>Tap <strong>"+"</strong> below the message action</li>
                  <li>Search <strong>"Send Message"</strong> → Select it</li>
                  <li>Tap <strong>"Recipients"</strong> field → Tap the variable icon (magic wand) → Select <strong>"Dictionary Value"</strong> (the phone number from step 4)</li>
                  <li>Tap <strong>"Message"</strong> field → Tap the variable icon → Select <strong>"Dictionary Value"</strong> (the message from step 5)</li>
                  <li>Make sure <strong>"Send via iMessage"</strong> toggle is ON</li>
                  <li><strong>Important:</strong> Turn OFF <strong>"Show Compose Sheet"</strong> (so it sends automatically)</li>
                </ol>
                <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 rounded text-xs">
                  <strong>⚠️ Common mistake:</strong> Make sure you're selecting the specific "Dictionary Value" outputs from steps 4 and 5, not a generic "Dictionary Value". When you tap the field, look for the variable names that match your previous actions.
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Step 4: Name & Automate */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold text-lg">4</span>
              Name Shortcut & Create Daily Automation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Name the shortcut:</p>
              <p className="text-xs ml-2">Tap "New Shortcut" at top → Rename to <strong>"MizeUp Reminders"</strong> → Tap "Done"</p>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Create automation:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs ml-2">
                <li>Go to <strong>"Automation"</strong> tab (bottom)</li>
                <li>Tap <strong>"+"</strong> → <strong>"Time of Day"</strong></li>
                <li>Set time to your reminder time</li>
                <li>Tap <strong>"Next"</strong> → <strong>"Add Action"</strong></li>
                <li>Search <strong>"Run Shortcut"</strong> → Select <strong>"MizeUp Reminders"</strong></li>
                <li>Tap <strong>"Next"</strong></li>
                <li><strong>Turn OFF "Ask Before Running"</strong> ⚠️</li>
                <li>Tap <strong>"Don't Ask"</strong> → <strong>"Done"</strong></li>
              </ol>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                ✅ Done! Reminders will send automatically every day.
              </p>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}

