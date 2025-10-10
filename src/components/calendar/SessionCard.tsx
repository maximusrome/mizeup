'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { deleteSession, deleteSessionWithScope } from '@/lib/api'
import type { Session } from '@/types'

interface SessionCardProps {
  session: Session
  onEdit: (session: Session) => void
  onDelete: (sessionId: string) => void
  onBulkDelete?: () => void
}

export default function SessionCard({ session, onEdit, onDelete, onBulkDelete }: SessionCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = () => {
    if (session.recurring_group_id) {
      setShowDeleteDialog(true)
      } else {
        // Regular session deletion - no confirmation needed
        handleDelete('single')
      }
  }

  const handleDelete = async (scope: 'single' | 'all_future') => {
    try {
      setIsDeleting(true)
      if (session.recurring_group_id) {
        await deleteSessionWithScope(session.id, scope)
        
        if (scope === 'all_future' && onBulkDelete) {
          // For all future deletions, refetch all sessions to reflect changes
          onBulkDelete()
        } else {
          onDelete(session.id)
        }
      } else {
        await deleteSession(session.id)
        onDelete(session.id)
      }
      setShowDeleteDialog(false)
    } catch (error) {
      console.error('Error deleting session:', error)
      alert('Failed to delete session. Please try again.')
    } finally {
      setIsDeleting(false)
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
          {session.recurring_group_id && (
            <svg className="w-3 h-3 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <title>Recurring session</title>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )}
          {session.synced_to_therapynotes && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-green-100 text-green-800">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Synced
            </span>
          )}
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
          onClick={handleDeleteClick}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </Button>
      </div>
      
      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowDeleteDialog(false)}
        >
          <Card 
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Delete Session</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteDialog(false)}
                  className="text-muted-foreground hover:text-foreground h-10 w-10 p-0 rounded-full text-lg"
                >
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                This is a recurring session. What would you like to delete?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleDelete('single')}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'This Session Only'}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete('all_future')}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? 'Deleting...' : 'All Future Sessions'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
