'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { login, signup } from '../actions'

function AuthPageContent() {
  const [urlMessage, setUrlMessage] = useState('')
  const [isLoginLoading, setIsLoginLoading] = useState(false)
  const [isSignupLoading, setIsSignupLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('login')
  const [showLoginPassword, setShowLoginPassword] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setUrlMessage(message)
    }
    
    // Check for tab parameter to determine active tab
    const tab = searchParams.get('tab')
    if (tab === 'signup') {
      setActiveTab('signup')
    } else {
      setActiveTab('login')
    }
  }, [searchParams])

  const handleLogin = async (formData: FormData) => {
    setIsLoginLoading(true)
    setError('')
    const result = await login(formData)
    if (result?.error) {
      setError(result.error)
      setIsLoginLoading(false)
    }
  }

  const handleSignup = async (formData: FormData) => {
    setIsSignupLoading(true)
    setError('')
    const result = await signup(formData)
    if (result?.error) {
      setError(result.error)
      setIsSignupLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Welcome to <span className="logo-gradient">MizeUp</span></CardTitle>
          <CardDescription className="text-center">
            Log in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          {urlMessage && (
            <div className={`mb-4 p-3 rounded-md ${
              urlMessage.toLowerCase().includes('success') || urlMessage.toLowerCase().includes('updated')
                ? 'bg-success-light border border-success'
                : 'bg-destructive-light border border-destructive'
            }`}>
              <p className={`text-sm ${
                urlMessage.toLowerCase().includes('success') || urlMessage.toLowerCase().includes('updated')
                  ? 'text-success'
                  : 'text-destructive'
              }`}>
                {urlMessage}
              </p>
            </div>
          )}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Log In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); handleLogin(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input 
                    id="login-email"
                    name="email" 
                    type="email" 
                    placeholder="Enter your email" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="login-password"
                      name="password" 
                      type={showLoginPassword ? "text" : "password"} 
                      placeholder="Enter your password" 
                      className="pr-10"
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <div className="text-right">
                    <a 
                      href="/reset-password" 
                      className="text-sm text-info hover:text-info/80"
                    >
                      Forgot password?
                    </a>
                  </div>
                </div>
                {error && (
                  <div className="p-3 bg-destructive-light border border-destructive rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isLoginLoading}>
                  {isLoginLoading ? 'Logging In...' : 'Log In'}
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup" className="space-y-4">
              <form onSubmit={(e) => { e.preventDefault(); handleSignup(new FormData(e.currentTarget)); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input 
                    id="signup-email"
                    name="email" 
                    type="email" 
                    placeholder="Enter your email" 
                    required 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input 
                      id="signup-password"
                      name="password" 
                      type={showSignupPassword ? "text" : "password"} 
                      placeholder="Create a password" 
                      className="pr-10"
                      minLength={8}
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && (
                  <div className="p-3 bg-destructive-light border border-destructive rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={isSignupLoading}>
                  {isSignupLoading ? 'Signing Up...' : 'Sign Up'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthPageContent />
    </Suspense>
  )
}