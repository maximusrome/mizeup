'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/Sidebar'

const QUESTIONS = [
  {
    id: 'q1',
    text: 'Did you need to manage maladaptive communication (related to, e.g., high anxiety, high reactivity, repeated questions, or disagreement) among participants that complicates delivery of care?',
    answer: false,
    code: '90785',
    note: 'Managed maladaptive communication among participants, such as high anxiety, reactivity, repeated questions, or disagreement. This complicated care delivery by impeding therapeutic engagement. Interventions included de-escalation techniques, clarification, and redirection to facilitate session progress.'
  },
  {
    id: 'q2', 
    text: 'Did the caregiver\'s emotions/behavior interfere with implementation of the treatment plan?',
    answer: false,
    code: '90785',
    note: 'Caregiver emotions and behaviors, such as agitation or disagreement with the plan, interfered with treatment implementation by disrupting focus. Interventions included addressing concerns, mediating dynamics, and refocusing on goals to enable effective care.'
  },
  {
    id: 'q3',
    text: 'Was there evidence/disclosure of a sentinel event and mandated report to a third party (e.g., abuse or neglect with report to state agency) with initiation of discussion of the sentinel event and/or report with patient and other visit participants?',
    answer: false,
    code: '90785',
    note: 'Evidence or disclosure of a sentinel event, such as abuse or neglect, required a mandated report to a third party like a state agency. Discussion of the event and report process involved the patient and participants. This complicated care delivery by shifting focus to crisis response. Interventions included explaining obligations, providing support, and integrating into the plan.'
  },
  {
    id: 'q4',
    text: 'Did you use play equipment, physical devices, interpreter, or translator to overcome significant language barriers?',
    answer: false,
    code: '90785',
    note: 'Used play equipment, physical devices, interpreter, or translator to overcome significant language or communication barriers due to the patient\'s limited skills. This complicated care delivery by requiring adapted interaction methods. Interventions included employing these tools to ensure engagement and comprehension.'
  },
  {
    id: 'q5',
    text: 'Was the service provided in the office at times other than regularly scheduled office hours, or days when the office is normally closed (e.g., holidays, Saturday or Sunday), in addition to basic service?',
    answer: false,
    code: '99050',
    note: 'This session was provided in the office outside the practice\'s regularly scheduled office hours of Monday-Friday 9:00 AM-5:00 PM, thereby meeting criteria for add-on code 99050.'
  }
]

const Section = ({ title, open, onToggle, children }: { title: string; open: boolean; onToggle: () => void; children: React.ReactNode }) => (
  <div className="border rounded-lg">
    <button onClick={onToggle} className="w-full px-4 py-3 flex items-center justify-between bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-t-lg">
      <span className="font-semibold">{title}</span>
      <span className={`transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
    </button>
    {open && <div className="p-4 space-y-2">{children}</div>}
  </div>
)

export default function SessionProgressNotePage() {
  const { sessionId } = useParams()
  const router = useRouter()
  const [open1, setOpen1] = useState(true)
  const [open2, setOpen2] = useState(true)
  const [questions, setQuestions] = useState(QUESTIONS)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch(`/api/notes/${sessionId}`)
      .then(res => res.json())
      .then(({ data }) => {
        if (data?.content?.notes) {
          const texts = data.content.notes.map((n: { text: string }) => n.text)
          setQuestions(prev => prev.map(q => ({ ...q, answer: texts.includes(q.note) })))
        }
      })
  }, [sessionId])

  const toggle = (id: string) => {
    setQuestions(prev => {
      const q = prev.find(x => x.id === id)
      if (!q) return prev
      return prev.map(x => 
        x.id === id ? { ...x, answer: !x.answer } : 
        x.code === q.code ? { ...x, answer: false } : x
      )
    })
  }

  const save = async () => {
    setSaving(true)
    const selected = questions.filter(q => q.answer)
    await fetch(`/api/notes/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: { notes: selected.map(q => ({ code: q.code, text: q.note })) },
        status: selected.length > 0 ? 'completed' : 'draft'
      })
    })
    router.push('/private/calendar')
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="pt-16 lg:pt-0 lg:pl-64">
        <div className="container mx-auto px-4 max-w-6xl py-8">
          <Button variant="ghost" size="sm" onClick={() => router.push('/private/calendar')} className="mb-4">← Back</Button>
          
          <h1 className="text-3xl font-bold mb-6">Progress Note</h1>
          
          <div className="space-y-4 mb-6">
            <Section title="Interactive Complexity +90785" open={open1} onToggle={() => setOpen1(!open1)}>
              {questions.filter(q => q.code === '90785').map(q => (
                <div key={q.id}>
                  <div className="flex items-start gap-3 cursor-pointer p-3 hover:bg-muted/30 rounded" onClick={() => toggle(q.id)}>
                    <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${q.answer ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {q.answer && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <span className="text-sm flex-1">{q.text}</span>
                  </div>
                  {q.answer && (
                    <div className="ml-6 mb-2">
                      <div className="bg-muted/30 border border-success/30 rounded-lg p-3 mb-2">
                        <p className="text-sm">{q.note}</p>
                      </div>
                      <p className="text-sm text-success font-medium ml-3">Selected for note</p>
                    </div>
                  )}
                </div>
              ))}
            </Section>

            <Section title="After Hours +99050" open={open2} onToggle={() => setOpen2(!open2)}>
              {questions.filter(q => q.code === '99050').map(q => (
                <div key={q.id}>
                  <div className="flex items-start gap-3 cursor-pointer p-3 hover:bg-muted/30 rounded" onClick={() => toggle(q.id)}>
                    <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${q.answer ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                      {q.answer && <div className="w-2 h-2 rounded-full bg-white"></div>}
                    </div>
                    <span className="text-sm flex-1">{q.text}</span>
                  </div>
                  {q.answer && (
                    <div className="ml-6 mb-2">
                      <div className="bg-muted/30 border border-success/30 rounded-lg p-3 mb-2">
                        <p className="text-sm">{q.note}</p>
                      </div>
                      <p className="text-sm text-success font-medium ml-3">Selected for note</p>
                    </div>
                  )}
                </div>
              ))}
            </Section>
          </div>
          
          <Button onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </div>
    </div>
  )
}
