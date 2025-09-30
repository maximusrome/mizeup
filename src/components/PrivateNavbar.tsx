'use client'

import SignOutButton from '@/app/auth/components/SignOutButton'

export default function PrivateNavbar() {
  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold logo-gradient">MizeUp</h1>
          </div>
          
          {/* Sign Out Button */}
          <div className="flex items-center">
            <SignOutButton />
          </div>
        </div>
      </div>
    </nav>
  )
}

