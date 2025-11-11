'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { AudioLines } from 'lucide-react'

// Type definitions for Web Speech API
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

declare global {
  interface Window {
    SpeechRecognition: {
      prototype: SpeechRecognition
      new(): SpeechRecognition
    }
    webkitSpeechRecognition: {
      prototype: SpeechRecognition
      new(): SpeechRecognition
    }
  }
}

// Utility function
function cleanupTranscript(text: string): string {
  const cleaned = text?.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  
  const capitalized = cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : capitalized + '.'
}

// Hook
function useVoiceTranscription({
  onTranscript,
  continuous = true,
  interimResults = true,
  language = 'en-US',
}: {
  onTranscript: (text: string, isFinal: boolean) => void
  continuous?: boolean
  interimResults?: boolean
  language?: string
}) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onTranscriptRef = useRef(onTranscript)
  const isManuallyStoppingRef = useRef(false)
  const restartTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition()
      recognition.continuous = continuous
      recognition.interimResults = interimResults
      recognition.lang = language

      recognition.onstart = () => {
        isManuallyStoppingRef.current = false
        setIsListening(true)
      }

      recognition.onresult = (event) => {
        let interimTranscript = ''
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' '
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          onTranscriptRef.current(finalTranscript.trim(), true)
        } else if (interimTranscript) {
          onTranscriptRef.current(interimTranscript, false)
        }
      }

      recognition.onend = () => {
        if (isManuallyStoppingRef.current) {
          setIsListening(false)
          return
        }
        
        if (continuous) {
          restartTimeoutRef.current = window.setTimeout(() => {
            if (recognitionRef.current && !isManuallyStoppingRef.current) {
              try {
                recognitionRef.current.start()
              } catch {
                setIsListening(false)
              }
            }
          }, 200)
        } else {
          setIsListening(false)
        }
      }

      recognition.onerror = (event) => {
        if (event.error === 'no-speech' || event.error === 'aborted') return

        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          isManuallyStoppingRef.current = true
          setIsListening(false)
          alert('Microphone access denied. Please enable microphone permissions.')
          return
        }

        if (event.error === 'network' || event.error === 'audio-capture') {
          isManuallyStoppingRef.current = true
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (restartTimeoutRef.current) window.clearTimeout(restartTimeoutRef.current)
      try {
        recognitionRef.current?.abort()
      } catch {}
    }
  }, [continuous, interimResults, language])

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported || isListening) return

    isManuallyStoppingRef.current = false
    try {
      recognitionRef.current.start()
    } catch {}
  }, [isListening, isSupported])

  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return

    if (restartTimeoutRef.current) {
      window.clearTimeout(restartTimeoutRef.current)
      restartTimeoutRef.current = null
    }

    isManuallyStoppingRef.current = true
    setIsListening(false)
    try {
      recognitionRef.current.stop()
    } catch {}
  }, [])

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }, [isListening, startListening, stopListening])

  return {
    isListening,
    isSupported,
    startListening,
    stopListening,
    toggleListening,
  }
}

// Component
interface VoiceInputButtonProps {
  onTranscript: (text: string, isFinal: boolean) => void
  disabled?: boolean
}

export function VoiceInputButton({ onTranscript, disabled = false }: VoiceInputButtonProps) {
  const { isListening, isSupported, toggleListening } = useVoiceTranscription({
    onTranscript: (text, isFinal) => {
      if (isFinal) {
        onTranscript(cleanupTranscript(text), isFinal)
      } else {
        onTranscript(text, isFinal)
      }
    },
  })

  return (
    <Button
      type="button"
      variant={isListening ? 'destructive' : 'outline'}
      size="sm"
      onClick={toggleListening}
      disabled={disabled || !isSupported}
      title={!isSupported ? 'Voice input not supported' : isListening ? 'Stop recording' : 'Start recording'}
      aria-label={isListening ? 'Stop recording' : 'Start recording'}
      aria-pressed={isListening}
    >
      <AudioLines className="size-4 sm:mr-1.5" />
      <span className="hidden sm:inline">{isListening ? 'Stop' : 'Speak'}</span>
    </Button>
  )
}

