'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { History } from 'lucide-react'

interface PlanHistoryItem {
  sessionId: string
  date: string
  plan: string
}

interface PlanHistoryButtonProps {
  clientId: string
  currentSessionId: string
  onSelect: (plan: string) => void
  disabled?: boolean
}

export function PlanHistoryButton({ 
  clientId, 
  currentSessionId, 
  onSelect, 
  disabled = false 
}: PlanHistoryButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [history, setHistory] = useState<PlanHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchHistory = async () => {
    if (history.length > 0) {
      setIsOpen(!isOpen)
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/notes/history/${clientId}?exclude=${currentSessionId}`)
      const { data, error: err } = await res.json()
      if (!res.ok || err) throw new Error(err || 'Failed to fetch history')
      setHistory(data || [])
      setIsOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={fetchHistory}
        disabled={disabled || loading}
      >
        <History className="size-4 sm:mr-1.5" />
        <span className="hidden sm:inline">History</span>
      </Button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-96 max-w-[calc(100vw-2rem)] bg-white border rounded-lg shadow-lg z-50 max-h-96 overflow-auto">
            <div className="p-3 border-b bg-muted/50">
              <h3 className="font-semibold text-sm">Previous Plans</h3>
            </div>
            
            {loading && <div className="p-4 text-sm text-muted-foreground text-center">Loading...</div>}
            {error && <div className="p-4 text-sm text-destructive">{error}</div>}
            {!loading && !error && !history.length && (
              <div className="p-4 text-sm text-muted-foreground text-center">No previous plans found</div>
            )}
            {!loading && !error && history.length > 0 && (
              <div className="divide-y">
                {history.map((item) => (
                  <button
                    key={item.sessionId}
                    type="button"
                    onClick={() => {
                      onSelect(item.plan)
                      setIsOpen(false)
                    }}
                    className="w-full p-3 text-left hover:bg-muted/30 transition-colors"
                  >
                    <div className="text-xs text-muted-foreground mb-1">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    <div className="text-sm line-clamp-3">{item.plan}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

