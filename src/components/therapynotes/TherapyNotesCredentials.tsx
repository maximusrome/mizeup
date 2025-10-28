'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Eye, EyeOff, Check } from 'lucide-react'

interface Credentials {
  therapynotes_username: string
  therapynotes_password: string
  therapynotes_practice_code: string
}

export default function TherapyNotesCredentials() {
  const [credentials, setCredentials] = useState<Credentials>({
    therapynotes_username: '',
    therapynotes_password: '',
    therapynotes_practice_code: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  // Load existing credentials
  useEffect(() => {
    const loadCredentials = async () => {
      setLoading(true)
      try {
        const response = await fetch('/api/therapynotes/credentials')
        if (response.ok) {
          const data = await response.json()
          if (data.username || data.password || data.practiceCode) {
            setCredentials({
              therapynotes_username: data.username || '',
              therapynotes_password: data.password || '',
              therapynotes_practice_code: data.practiceCode || ''
            })
            setIsConnected(!!(data.username && data.password && data.practiceCode))
          }
        }
      } catch {
        // Silently fail if credentials can't be loaded
      } finally {
        setLoading(false)
      }
    }
    loadCredentials()
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)

    try {
      const response = await fetch('/api/therapynotes/credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.therapynotes_username,
          password: credentials.therapynotes_password,
          practiceCode: credentials.therapynotes_practice_code
        })
      })

      const data = await response.json()

      if (response.ok) {
        setMessage({ type: 'success', text: 'TherapyNotes credentials saved successfully' })
        setIsConnected(!!(credentials.therapynotes_username && credentials.therapynotes_password && credentials.therapynotes_practice_code))
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to save credentials' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            TherapyNotes Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          TherapyNotes Integration
          {isConnected && (
            <span className="ml-auto flex items-center gap-1 text-sm font-normal text-green-600">
              <Check className="h-4 w-4" />
              Connected
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Connect your TherapyNotes account to sync sessions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="practice-code">Practice Code</Label>
          <Input
            id="practice-code"
            type="text"
            placeholder="e.g., YourPracticeName"
            value={credentials.therapynotes_practice_code}
            onChange={(e) => setCredentials({ ...credentials, therapynotes_practice_code: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="username">Username</Label>
          <Input
            id="username"
            type="text"
            placeholder="Your TherapyNotes username"
            value={credentials.therapynotes_username}
            onChange={(e) => setCredentials({ ...credentials, therapynotes_username: e.target.value })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Your TherapyNotes password"
              value={credentials.therapynotes_password}
              onChange={(e) => setCredentials({ ...credentials, therapynotes_password: e.target.value })}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {message && (
          <div className={`p-3 rounded text-sm ${
            message.type === 'success' 
              ? 'bg-green-50 text-green-900 border border-green-200' 
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        <Button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full"
        >
          {saving ? 'Saving...' : 'Save Credentials'}
        </Button>
      </CardContent>
    </Card>
  )
}

