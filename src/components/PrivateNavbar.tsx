'use client'

import SignOutButton from '@/app/auth/components/SignOutButton'

export default function PrivateNavbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold logo-gradient">MizeUp</h1>
          </div>
          
          {/* Page Title */}
          <div className="flex items-center">
            <h2 className="text-lg font-semibold text-foreground">Optimize Codes</h2>
          </div>
          
          {/* Log Out Button */}
          <div className="flex items-center">
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  )
}

