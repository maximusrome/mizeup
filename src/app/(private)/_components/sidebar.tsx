'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Calendar,
  DollarSign, 
  User, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const navigation = [
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Revenue', href: '/revenue', icon: DollarSign },
]

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const pathname = usePathname()

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCollapsed(false)
        setIsOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && window.innerWidth < 1024) {
        const sidebar = document.getElementById('sidebar')
        const header = document.querySelector('[data-header]')
        const target = event.target as Node
        
        // Only close if clicking on main content, not on sidebar or header
        if (sidebar && !sidebar.contains(target) && 
            header && !header.contains(target)) {
          setIsOpen(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const toggleSidebar = () => {
    if (window.innerWidth < 1024) {
      setIsOpen(!isOpen)
    } else {
      setIsCollapsed(!isCollapsed)
    }
  }

  return (
    <>
      {/* Sidebar */}
      <div
        id="sidebar"
        className={`
          fixed left-0 z-40 bg-background border-r transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-16' : 'w-64'}
          ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          top-0 h-full
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo - desktop only */}
          <div className="lg:block p-4">
            <h1 className="text-2xl font-bold logo-gradient">MizeUp</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 p-4 pt-6 lg:pt-4 space-y-2">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              const Icon = item.icon

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    // Close mobile menu when link is clicked
                    if (window.innerWidth < 1024) {
                      setIsOpen(false)
                    }
                  }}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>{item.name}</span>}
                </Link>
              )
            })}
          </nav>

          {/* Bottom pinned account link */}
          <div className="p-4 border-t">
            {(() => {
              const isActive = pathname === '/account'
              return (
                <Link
                  href="/account"
                  onClick={() => {
                    if (window.innerWidth < 1024) {
                      setIsOpen(false)
                    }
                  }}
                  className={`
                    flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                    ${isActive 
                      ? 'bg-primary text-primary-foreground' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <User className="h-4 w-4 flex-shrink-0" />
                  {!isCollapsed && <span>Account</span>}
                </Link>
              )
            })()}
          </div>
        </div>
      </div>

      {/* Header - mobile only */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b lg:hidden" data-header>
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="flex items-center justify-between h-16">
          {/* Hamburger menu button - only on mobile */}
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsOpen(!isOpen)
            }}
            className="z-50 lg:hidden"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
          
          {/* Desktop collapse button - only on desktop */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleSidebar}
            className="hidden lg:flex z-50"
          >
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </Button>
          
          {/* MizeUp logo */}
          <h1 className="text-2xl font-bold logo-gradient">MizeUp</h1>
          
          {/* Spacer for balance */}
          <div className="w-10"></div>
          </div>
        </div>
      </div>
    </>
  )
}
