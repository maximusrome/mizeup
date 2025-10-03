'use client'

import { Button } from '@/components/ui/button'
import { deleteSession } from '@/lib/api'
import type { Session } from '@/types'

interface SessionCardProps {
  session: Session
  onEdit: (session: Session) => void
  onDelete: (sessionId: string) => void
}

export default function SessionCard({ session, onEdit, onDelete }: SessionCardProps) {
  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this session?')) {
      try {
        await deleteSession(session.id)
        onDelete(session.id)
      } catch (error) {
        console.error('Error deleting session:', error)
        alert('Failed to delete session. Please try again.')
      }
    }
  }

  // Format time for display
  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return ''
    try {
      const [hours, minutes] = timeString.split(':').map(Number)
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return timeString
    }
  }

  return (
    <div className="flex justify-between items-center p-3 bg-muted/50 rounded-md border hover:bg-muted/70">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-foreground">
            {formatTimeForDisplay(session.start_time)}
          </span>
          <span className="text-sm truncate">
            {session.clients?.name || 'Unknown Client'}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onEdit(session)}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 h-8 w-8 p-0"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
    </div>
  )
}
