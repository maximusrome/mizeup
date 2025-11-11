'use client'

import { useState, useEffect } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { updatePassword } from '../actions'

export default function UpdatePasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSessionReady, setIsSessionReady] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient()
      
      // Check if this is a password reset callback (has hash fragments)
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const accessToken = hashParams.get('access_token')
      const refreshToken = hashParams.get('refresh_token')
      
      if (accessToken && refreshToken) {
        // Exchange the tokens for a session
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        
        if (error) {
          setError('Invalid or expired reset link. Please request a new one.')
        } else {
          setIsSessionReady(true)
          // Clear the hash from URL for security
          window.history.replaceState(null, '', window.location.pathname)
        }
      } else {
        // Check if user already has a valid session
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          setIsSessionReady(true)
        } else {
          setError('No valid session found. Please request a new password reset link.')
        }
      }
    }

    handleAuthCallback()
  }, [])

  const handleSubmit = async (formData: FormData) => {
    if (!isSessionReady) {
      setError('Session not ready. Please try again.')
      return
    }

    setIsLoading(true)
    setError('')

    const result = await updatePassword(formData)
    
    if (result?.error) {
      setError(result.error)
      setIsLoading(false)
    }
    // If successful, server action redirects automatically
  }

  // Show loading state while checking session
  if (!isSessionReady && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Verifying reset link...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Set New Password</CardTitle>
          <CardDescription className="text-center">
            Enter your new password below
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSessionReady ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input 
                    id="password"
                    name="password" 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter new password" 
                    className="pr-10"
                    minLength={8}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input 
                    id="confirmPassword"
                    name="confirmPassword" 
                    type={showConfirmPassword ? "text" : "password"} 
                    placeholder="Confirm new password" 
                    className="pr-10"
                    minLength={8}
                    required 
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Updating Password...' : 'Update Password'}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-red-600">Unable to verify reset link</p>
              <Button asChild>
                <a href="/reset-password">Request New Reset Link</a>
              </Button>
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