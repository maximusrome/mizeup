'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/Sidebar'

interface LoginResult {
  success?: boolean
  accessToken?: string
  sessionId?: string
  error?: string
  details?: string
  message?: string
}

export default function TherapyNotesPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<LoginResult | null>(null)

  const handleLogin = async () => {
    setLoading(true)
    setResult(null)

    try {
      const response = await fetch('/api/therapynotes/login', {
        method: 'POST',
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pt-16 lg:pt-0 lg:pl-64">
        <div className="container mx-auto px-4 max-w-4xl py-8">
          <h1 className="text-3xl font-bold mb-6">TherapyNotes Connection</h1>

          <div className="bg-card border rounded-lg p-6 space-y-4">
            <p className="text-muted-foreground">
              Connect to TherapyNotes using your stored credentials.
            </p>

            <Button
              onClick={handleLogin}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Connecting...' : 'Connect to TherapyNotes'}
            </Button>

            {result && (
              <div className="mt-6">
                <h2 className="text-xl font-semibold mb-3">Result:</h2>
                <div className={`p-4 rounded border ${
                  result.success 
                    ? 'bg-green-50 border-green-200 text-green-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}>
                  <pre className="text-sm overflow-auto whitespace-pre-wrap">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded text-sm">
            <div className="font-semibold mb-2">📋 What this does:</div>
            <p className="text-gray-700">
              Authenticates with TherapyNotes using your stored credentials. 
              Once connected, you can sync sessions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

