import SignOutButton from './_components/sign-out-button'
import TherapyNotesCredentials from './_components/therapynotes-form'
import SquareForm from './_components/square-form'
import VenmoForm from './_components/venmo-form'
import ReminderSettings from './_components/reminder-settings'
import CalendarSettings from './_components/calendar-settings'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'

export default async function AccountPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  return (
    <div className="container mx-auto px-4 max-w-6xl">
          <div className="py-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-foreground">Account</h1>
            </div>
            
            <div className="space-y-6">
              {/* Account Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Account</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user.email}</p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Member Since</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(user.created_at)}
                    </p>
                  </div>

                  <div className="pt-4">
                    <SignOutButton />
                  </div>
                </CardContent>
              </Card>

              {/* TherapyNotes Integration */}
              <TherapyNotesCredentials />

              {/* Square Integration */}
              <SquareForm />

              {/* Venmo Integration */}
              <VenmoForm />

              {/* Calendar Import */}
              <CalendarSettings />

              {/* Session Reminders */}
              <ReminderSettings />
            </div>
          </div>
        </div>
  )
}
