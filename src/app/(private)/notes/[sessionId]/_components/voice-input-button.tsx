'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { AudioLines, Square } from 'lucide-react'

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null
  onend: ((this: SpeechRecognition, ev: Event) => void) | null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
}

interface SpeechRecognitionEvent extends Event {
  resultIndex: number
  results: SpeechRecognitionResultList
}

interface SpeechRecognitionResultList {
  length: number
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
}

declare global {
  interface Window {
    SpeechRecognition: { new(): SpeechRecognition }
    webkitSpeechRecognition: { new(): SpeechRecognition }
  }
}

function cleanupTranscript(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  const capitalized = cleaned[0].toUpperCase() + cleaned.slice(1)
  return /[.!?]$/.test(capitalized) ? capitalized : capitalized + '.'
}

class VoiceRecognitionManager {
  private recognition: SpeechRecognition | null = null
  private isListening = false
  private activeId: string | null = null
  private callback: ((text: string, isFinal: boolean) => void) | null = null
  private silenceTimer?: number
  private pendingStart: { id: string; callback: (text: string, isFinal: boolean) => void } | null = null
  private listeners = new Set<(id: string | null, listening: boolean) => void>()

  initialize() {
    if (typeof window === 'undefined' || this.recognition) return !!this.recognition

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return false

    this.recognition = new SR()
    this.recognition.continuous = true
    this.recognition.interimResults = true
    this.recognition.lang = 'en-US'

    this.recognition.onstart = () => {
      this.isListening = true
      this.notify()
    }

    this.recognition.onresult = (event) => {
      let final = ''
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript
        if (event.results[i].isFinal) final += text + ' '
        else interim += text
      }

      clearTimeout(this.silenceTimer)
      this.silenceTimer = window.setTimeout(() => this.stop(), 3000)

      if (final) this.callback?.(final.trim(), true)
      else if (interim) this.callback?.(interim, false)
    }

    this.recognition.onend = () => {
      this.isListening = false
      clearTimeout(this.silenceTimer)
      
      if (this.pendingStart) {
        const { id, callback } = this.pendingStart
        this.pendingStart = null
        this.activeId = id
        this.callback = callback
        setTimeout(() => this.recognition?.start(), 100)
      } else {
        this.notify()
      }
    }

    this.recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') return
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. Please enable microphone permissions.')
      }
      this.stop()
    }

    return true
  }

  start(id: string, callback: (text: string, isFinal: boolean) => void) {
    if (!this.initialize()) return false
    
    if (this.isListening) {
      if (this.activeId === id) return true
      this.pendingStart = { id, callback }
      this.activeId = id
      this.notify()
      this.recognition?.stop()
      return true
    }

    this.activeId = id
    this.callback = callback
    try {
      this.recognition?.start()
      return true
    } catch {
      this.isListening = false
      this.notify()
      return false
    }
  }

  stop() {
    clearTimeout(this.silenceTimer)
    this.pendingStart = null
    this.activeId = null
    this.callback = null
    
    if (this.isListening) {
      this.recognition?.stop()
    } else {
      this.notify()
    }
  }

  subscribe(listener: (id: string | null, listening: boolean) => void) {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  private notify() {
    this.listeners.forEach(fn => fn(this.activeId, this.isListening))
  }
}

const manager = new VoiceRecognitionManager()

function useVoiceTranscription(id: string, onTranscript: (text: string, isFinal: boolean) => void) {
  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(true)

  useEffect(() => {
    setIsSupported(manager.initialize())
    return manager.subscribe((activeId, listening) => setIsListening(activeId === id && listening))
  }, [id])

  const toggleListening = useCallback(() => {
    if (isListening) {
      manager.stop()
    } else {
      manager.start(id, onTranscript)
    }
  }, [id, isListening, onTranscript])

  return { isListening, isSupported, toggleListening }
}

interface VoiceInputButtonProps {
  id: string
  onTranscript: (text: string, isFinal: boolean) => void
  disabled?: boolean
}

export function VoiceInputButton({ id, onTranscript, disabled = false }: VoiceInputButtonProps) {
  const wrappedCallback = useCallback(
    (text: string, isFinal: boolean) => onTranscript(isFinal ? cleanupTranscript(text) : text, isFinal),
    [onTranscript]
  )

  const { isListening, isSupported, toggleListening } = useVoiceTranscription(id, wrappedCallback)

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
      {isListening ? <Square className="size-4 sm:mr-1.5 fill-current" /> : <AudioLines className="size-4 sm:mr-1.5" />}
      <span className="hidden sm:inline">{isListening ? 'Stop' : 'Speak'}</span>
    </Button>
  )
}
