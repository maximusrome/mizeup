import SignOutButton from './_components/sign-out-button'
import TherapyNotesCredentials from './_components/therapynotes-form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/server'
import { User, Mail, Calendar } from 'lucide-react'

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
              {/* User Information Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Account Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Member Since</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(user.created_at)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* TherapyNotes Integration */}
              <TherapyNotesCredentials />

              {/* Log Out Card */}
              <Card>
                <CardHeader>
                  <CardTitle>Log Out</CardTitle>
                </CardHeader>
                <CardContent>
                  <SignOutButton />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
  )
}
