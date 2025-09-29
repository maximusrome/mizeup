import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import SignOutButton from '@/app/auth/components/SignOutButton'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <SignOutButton />
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Welcome to <span className="logo-gradient">MizeUp</span>!</CardTitle>
            <CardDescription>
              You are successfully logged in to your dashboard.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This is your protected dashboard page. Only authenticated users can see this page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
