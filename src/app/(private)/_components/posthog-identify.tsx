'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import posthog from 'posthog-js'

export default function PostHogIdentify() {
  useEffect(() => {
    const supabase = createClient()

    const identifyUser = (user: { id: string; email?: string | null }) => {
      if (user?.email) {
        posthog.identify(user.id, { email: user.email })
      }
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) identifyUser(user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        identifyUser(session.user)
      } else if (event === 'SIGNED_OUT') {
        posthog.reset()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

