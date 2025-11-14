'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const router = useRouter()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showSyncWarning, setShowSyncWarning] = useState(false)
  const [isDeleting, setIsDeleting] = useState<'single' | 'all_future' | null>(null)

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
      setIsDeleting(scope)
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
    } catch {
      alert('Failed to delete session. Please try again.')
    } finally {
      setIsDeleting(null)
    }
  }

  // Format time for display
  const formatTimeForDisplay = (timeString: string) => {
    if (!timeString) return ''
    try {
      const [hours, minutes] = timeString.split(':').map(Number)
      const date = new Date()
      date.setHours(hours, minutes, 0, 0)
      const formatted = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }).format(date)

      return formatted.replace(':00', '')
    } catch {
      return timeString
    }
  }

  const isFutureSession = (() => {
    try {
      const sessionStart = new Date(`${session.date}T${session.start_time}`)
      return sessionStart.getTime() > Date.now()
    } catch {
      return false
    }
  })()

  const noteButtonClassName = `h-8 w-8 p-0 transition-colors ${
    session.has_progress_note
      ? 'text-[var(--primary)] hover:text-[var(--primary)] hover:bg-[var(--primary)]/10'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
  }`

  const noteButtonTitle = session.has_progress_note
    ? session.progress_note_synced
      ? 'Progress note synced'
      : 'Progress note available'
    : 'Progress note'

  return (
    <div className="flex justify-between items-center py-2.5">
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
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
            <span
              className="text-[var(--primary)]"
              style={{ filter: 'drop-shadow(0 0 4px rgba(0, 191, 255, 0.35))' }}
              title="Session synced"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
          {session.has_progress_note && session.progress_note_synced && (
            <span
              className="text-[var(--secondary)]"
              style={{ filter: 'drop-shadow(0 0 4px rgba(199, 185, 255, 0.35))' }}
              title="Progress note synced"
            >
              <svg className="w-4.5 h-4.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
              </svg>
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1">
        {!isFutureSession && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!session.synced_to_therapynotes) {
                setShowSyncWarning(true)
                return
              }
              router.push(`/notes/${session.id}`)
            }}
            className={noteButtonClassName}
            title={noteButtonTitle}
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </Button>
        )}
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
          disabled={isDeleting !== null}
          className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
        >
          {isDeleting !== null ? (
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
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
                  disabled={isDeleting !== null}
                >
                  {isDeleting === 'single' ? (
                    <>
                      <svg className="h-4 w-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'This Session Only'
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete('all_future')}
                  className="flex-1"
                  disabled={isDeleting !== null}
                >
                  {isDeleting === 'all_future' ? (
                    <>
                      <svg className="h-4 w-4 mr-2 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    'All Future Sessions'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Sync Warning Dialog */}
      {showSyncWarning && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowSyncWarning(false)}
        >
          <Card 
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Session Not Synced</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Please sync this session before creating a progress note.
              </p>
              <Button
                onClick={() => setShowSyncWarning(false)}
                className="w-full"
              >
                Got It
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
