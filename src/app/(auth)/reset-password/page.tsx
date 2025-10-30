'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { resetPassword } from '../actions'

export default function ResetPasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true)
    setMessage('')
    setError('')

    const result = await resetPassword(formData)

    setIsLoading(false)

    if (result?.error) {
      setError(result.error)
    } else if (result?.success) {
      setMessage(result.message || 'Check your email for the reset link.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Reset Password</CardTitle>
          <CardDescription className="text-center">
            Enter your email address and we&apos;ll send you a link to reset your password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email"
                name="email" 
                type="email" 
                placeholder="Enter your email" 
                required 
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Sending Reset Email...' : 'Send Reset Email'}
            </Button>
          </form>
          
          {message && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
              <p className="text-sm text-green-800">{message}</p>
            </div>
          )}
          
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
          
          <div className="mt-6 text-center">
            <a 
              href="/login" 
              className="text-sm text-blue-600 hover:text-blue-500"
            >
              Back to login
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}