'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { signOut } from '@/app/(auth)/actions'

export default function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
    } catch {
      // Only reset loading if there's an error (redirect failed)
      setIsLoading(false)
    }
    // Note: setIsLoading(false) intentionally omitted - signOut redirects on success
  }

  return (
    <Button 
      onClick={handleSignOut} 
      variant="outline" 
      disabled={isLoading}
    >
      {isLoading ? 'Logging Out...' : 'Log Out'}
    </Button>
  )
}
