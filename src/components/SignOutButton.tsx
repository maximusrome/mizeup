'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { createClient } from '@/utils/supabase/client'

export default function SignOutButton() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleSignOut = async () => {
    setIsLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signOut()
    
    if (!error) {
      router.refresh()
      router.push('/')
    }
    
    setIsLoading(false)
  }

  return (
    <Button 
      onClick={handleSignOut} 
      variant="outline" 
      disabled={isLoading}
      className="w-full sm:w-auto"
    >
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </Button>
  )
}
