'use client'

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import type { Session, ProgressNoteContent } from '@/types'
import { VoiceInputButton } from './_components/voice-input-button'
import { PlanHistoryButton } from './_components/plan-history-button'

// Constants
const INTERVENTION_OPTIONS = [
  'Cognitive Challenging', 'Cognitive Refocusing', 'Cognitive Reframing',
  'Communication Skills', 'Compliance Issues', 'DBT',
  'Exploration of Coping Patterns', 'Exploration of Emotions',
  'Exploration of Relationship Patterns', 'Guided Imagery',
  'Interactive Feedback', 'Interpersonal Resolutions',
  'Mindfulness Training', 'Preventative Services', 'Psycho-Education',
  'Relaxation/Deep Breathing', 'Review of Treatment Plan/Progress',
  'Role-Play/Behavioral Rehearsal', 'Structured Problem Solving',
  'Supportive Reflection', 'Symptom Management'
]

// Risk Assessment Options
const AREA_OF_RISK_OPTIONS = [
  'Suicidal ideation',
  'Homicidal ideation', 
  'Inability to care for self',
  'Inability to care for others',
  'Aggression toward others',
  'Aggression toward property',
  'Self-harm',
  'Elopement',
  'Substance misuse'
]

const RISK_FACTORS_OPTIONS = [
  'Current ideation',
  'Access to means',
  'History of attempts/behaviors',
  'Family history',
  'Impulsivity',
  'Hopelessness',
  'Recent loss',
  'Alcohol/Substance use'
]

const PROTECTIVE_FACTORS_OPTIONS = [
  'Positive social support',
  'Cultural/religious beliefs',
  'Social responsibility',
  'Children in the home',
  'Life satisfaction',
  'Positive coping skills',
  'Sufficient problem-solving skills',
  'Strong therapeutic rapport'
]

const MENTAL_STATUS_FIELDS = [
  { key: 'orientation', label: 'Orientation', options: [
    'X3: Oriented to Person, Place, and Time',
    'X2: Oriented to Person, Place; Impaired to Time',
    'X2: Oriented to Person, Time; Impaired to Place',
    'X2: Oriented to Time, Place; Impaired to Person',
    'X1: Oriented to Person; Impaired to Place, Time',
    'X1: Oriented to Place; Impaired to Person, Time',
    'X1: Oriented to Time; Impaired to Person, Place',
    'X0: Impaired to Person, Place, and Time',
    'Not Assessed'
  ]},
  { key: 'insight', label: 'Insight', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Nil', 'Not Assessed'] },
  { key: 'generalAppearance', label: 'General Appearance', options: ['Appropriate', 'Disheveled', 'Emaciated', 'Obese', 'Poor Hygiene', 'Not Assessed'] },
  { key: 'judgmentImpulse', label: 'Judgment/Impulse Control', options: ['Excellent', 'Good', 'Fair', 'Poor', 'Nil', 'Not Assessed'] },
  { key: 'dress', label: 'Dress', options: ['Appropriate', 'Eccentric', 'Seductive', 'Bizarre', 'Not Assessed'] },
  { key: 'memory', label: 'Memory', options: ['Intact', 'Poor Remote', 'Poor Recent', 'Not Assessed'] },
  { key: 'motorActivity', label: 'Motor Activity', options: ['Unremarkable', 'Agitation', 'Retardation', 'Posturing', 'Repetitive actions', 'Tics', 'Tremor', 'Unusual Gait', 'Not Assessed'] },
  { key: 'attentionConcentration', label: 'Attention/Concentration', options: ['Good', 'Distractible', 'Variable', 'Not Assessed'] },
  { key: 'interviewBehavior', label: 'Interview Behavior', options: ['Appropriate', 'Aggressive', 'Angry', 'Apathetic', 'Argumentative', 'Child-like', 'Demanding', 'Drastic', 'Evasive', 'Hostile', 'Irritable', 'Passive', 'Manipulative', 'Withdrawn', 'Uncooperative', 'Not Assessed'] },
  { key: 'thoughtProcess', label: 'Thought Process', options: ['Unremarkable', 'Blocking', 'Circumstantial', 'Flight of Ideas', 'Loose Associations', 'Perseveration', 'Tangential', 'Not Assessed'] },
  { key: 'speech', label: 'Speech', options: ['Normal', 'Hesitant', 'Pressured', 'Slurred', 'Soft', 'Stuttering', 'Mute', 'Verbose', 'Not Assessed'] },
  { key: 'thoughtContent', label: 'Thought Content', options: ['Appropriate', 'Preoccupied', 'Obsessions', 'Delusions: Persecutory', 'Delusions: Bizarre', 'Delusions: Grandeur', 'Delusions: Guilt', 'Delusions: Somatic', 'Delusions: Ideas of Reference', 'Delusions: Thought Broadcasting', 'Delusions: Thought Control', 'Not Assessed'] },
  { key: 'mood', label: 'Mood', options: ['Euthymic', 'Dysphoric', 'Depressed', 'Euphoric', 'Grandiose', 'Anxious', 'Labile', 'Irritable', 'Angry', 'Not Assessed'] },
  { key: 'perception', label: 'Perception', options: ['Unremarkable', 'Auditory Hallucinations', 'Visual Hallucinations', 'Olfactory Hallucinations', 'Tactile Hallucinations', 'Gustatory Hallucinations', 'Not Assessed'] },
  { key: 'affect', label: 'Affect', options: ['Congruent', 'Incongruent', 'Appropriate', 'Inappropriate', 'Reactive', 'Constricted', 'Blunted', 'Flat', 'Not Assessed'] },
  { key: 'functionalStatus', label: 'Functional Status', options: ['Intact', 'Mildly Impaired', 'Moderately Impaired', 'Severely Impaired', 'Variably Impaired', 'Not Assessed'] }
]

const NORMAL_VALUES: Record<string, string> = {
  orientation: 'X3: Oriented to Person, Place, and Time',
  insight: 'Excellent', generalAppearance: 'Appropriate', judgmentImpulse: 'Excellent',
  dress: 'Appropriate', memory: 'Intact', motorActivity: 'Unremarkable',
  attentionConcentration: 'Good', interviewBehavior: 'Appropriate',
  thoughtProcess: 'Unremarkable', speech: 'Normal', thoughtContent: 'Appropriate',
  mood: 'Euthymic', perception: 'Unremarkable', affect: 'Congruent', functionalStatus: 'Intact'
}

const NOT_ASSESSED_VALUES: Record<string, string> = MENTAL_STATUS_FIELDS.reduce(
  (acc, field) => {
    acc[field.key] = 'Not Assessed'
    return acc
  },
  {} as Record<string, string>
)

const QUESTIONS = [
  { id: 'q1', text: 'Did you need to manage maladaptive communication (related to, e.g., high anxiety, high reactivity, repeated questions, or disagreement) among participants that complicates delivery of care?', answer: false, code: '90785', note: 'Managed maladaptive communication among participants, such as high anxiety, reactivity, repeated questions, or disagreement. This complicated care delivery by impeding therapeutic engagement. Interventions included de-escalation techniques, clarification, and redirection to facilitate session progress.' },
  { id: 'q2', text: 'Did the caregiver\'s emotions/behavior interfere with implementation of the treatment plan?', answer: false, code: '90785', note: 'Caregiver emotions and behaviors, such as agitation or disagreement with the plan, interfered with treatment implementation by disrupting focus. Interventions included addressing concerns, mediating dynamics, and refocusing on goals to enable effective care.' },
  { id: 'q3', text: 'Was there evidence/disclosure of a sentinel event and mandated report to a third party (e.g., abuse or neglect with report to state agency) with initiation of discussion of the sentinel event and/or report with patient and other visit participants?', answer: false, code: '90785', note: 'Evidence or disclosure of a sentinel event, such as abuse or neglect, required a mandated report to a third party like a state agency. Discussion of the event and report process involved the patient and participants. This complicated care delivery by shifting focus to crisis response. Interventions included explaining obligations, providing support, and integrating into the plan.' },
  { id: 'q4', text: 'Did you use play equipment, physical devices, interpreter, or translator to overcome significant language barriers?', answer: false, code: '90785', note: 'Used play equipment, physical devices, interpreter, or translator to overcome significant language or communication barriers due to the patient\'s limited skills. This complicated care delivery by requiring adapted interaction methods. Interventions included employing these tools to ensure engagement and comprehension.' },
  { id: 'q5', text: 'Was the service provided in the office at times other than regularly scheduled office hours, or days when the office is normally closed (e.g., holidays, Saturday or Sunday), in addition to basic service?', answer: false, code: '99050', note: 'This session was provided in the office outside the practice\'s regularly scheduled office hours of Monday-Friday 9:00 AM-5:00 PM, thereby meeting criteria for add-on code 99050.' },
  { id: 'q6', text: 'Was the presenting problem typically life-threatening or complex and require immediate attention to a patient in high distress?', answer: false, code: '90839', note: 'This session addressed a presenting problem that was life-threatening or complex, requiring immediate attention to a patient in high distress. Crisis intervention techniques were employed to stabilize the patient and ensure safety.' },
  { id: 'q7', text: 'Was the face-to-face crisis psychotherapy total time greater than 75 minutes?', answer: false, code: '90840', note: 'The face-to-face crisis psychotherapy session exceeded 75 minutes in duration, requiring extended time to adequately address the crisis situation and ensure patient stabilization.' }
]

// Helper functions
const formatTime = (time: string) => {
  const [hours, minutes] = time.split(':')
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${minutes} ${ampm}`
}

// Strip HTML tags, decode entities, and preserve line breaks
const stripHtml = (html: string): string => {
  if (!html) return ''
  // Convert <br /> tags to newlines first
  const withBreaks = html.replace(/<br\s*\/?>/gi, '\n')
  const tmp = document.createElement('div')
  tmp.innerHTML = withBreaks
  return (tmp.innerText || tmp.textContent || '').trim()
}

// Components
const RadioGroup = ({ name, options, value, onChange }: { name: string; options: string[]; value: string; onChange: (val: string) => void }) => (
  <div className="space-y-2">
    {options.map(opt => (
      <label key={opt} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
        <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="cursor-pointer" />
        <span className="text-sm">{opt}</span>
      </label>
    ))}
  </div>
)

const SuggestionField = ({ options, value, onChange, placeholder, label }: { options: string[], value: string, onChange: (value: string) => void, placeholder: string, label: string }) => (
  <div className="space-y-2">
    <Label className="text-sm font-medium">{label}</Label>
    <div className="flex flex-wrap gap-2 mb-2">
      {options.map(option => (
        <button
          key={option}
          type="button"
          onClick={() => {
            const currentValue = value.trim()
            const newValue = currentValue ? `${currentValue}, ${option}` : option
            onChange(newValue)
          }}
          className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-md border border-gray-300 transition-colors"
        >
          + {option}
        </button>
      ))}
    </div>
    <Textarea 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      rows={2} 
      className="resize-none" 
    />
  </div>
)

export default function SessionProgressNotePage() {
  const { sessionId } = useParams()
  const router = useRouter()
  const [questions, setQuestions] = useState(QUESTIONS)
  const [saving, setSaving] = useState(false)
  const [session, setSession] = useState<Session | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Progress Note State
  const [diagnosisCode, setDiagnosisCode] = useState('')
  const [diagnosisDescription, setDiagnosisDescription] = useState('')
  const [mentalStatus, setMentalStatus] = useState<Record<string, string>>({ ...NORMAL_VALUES })
  const [mentalStatusAllNormal, setMentalStatusAllNormal] = useState(true)
  const [patientDeniesRisk, setPatientDeniesRisk] = useState(true)
  const [riskAssessment, setRiskAssessment] = useState({ areaOfRisk: '', levelOfRisk: '', intentToAct: '', planToAct: '', meansToAct: '', riskFactors: '', protectiveFactors: '', additionalDetails: '' })
  const [medications, setMedications] = useState('')
  const [subjectiveReport, setSubjectiveReport] = useState('')
  const [objectiveContent, setObjectiveContent] = useState('')
  const [interventions, setInterventions] = useState<string[]>([])
  const [treatmentProgress, setTreatmentProgress] = useState('')
  const [assessment, setAssessment] = useState('')
  const [plan, setPlan] = useState('')
  const [recommendation, setRecommendation] = useState('continue')
  const [prescribedFrequency, setPrescribedFrequency] = useState('Weekly')
  const [tnPrefilled, setTnPrefilled] = useState(false)
  const [treatmentObjectivesDetailed, setTreatmentObjectivesDetailed] = useState<{ Id: number; TreatmentObjectiveDescription: string }[]>([])
  const [additionalDiagnoses, setAdditionalDiagnoses] = useState<{ code: string; description: string }[]>([])
  const [crisisSessionDuration, setCrisisSessionDuration] = useState<number>(75)
  const didAutoPullRef = useRef(false)

  const serviceCodes = useMemo(() => {
    // Check if crisis psychotherapy is used
    const isCrisis = questions.some(q => q.code === '90839' && q.answer)
    const codes = [isCrisis ? '90839' : '90837']
    if (questions.some(q => q.code === '90785' && q.answer)) codes.push('+90785')
    if (questions.some(q => q.code === '99050' && q.answer)) codes.push('+99050')
    if (questions.some(q => q.code === '90840' && q.answer)) codes.push('+90840')
    return codes.join(' ')
  }, [questions])

  const subjectiveBaseRef = useRef('')
  const planBaseRef = useRef('')

  const createTranscriptHandler = (baseRef: React.MutableRefObject<string>, setter: (value: string) => void) => 
    (transcript: string, isFinal: boolean) => {
      const newText = baseRef.current ? `${baseRef.current} ${transcript}` : transcript
      if (isFinal) baseRef.current = newText
      setter(newText)
    }

  const createTextChangeHandler = (baseRef: React.MutableRefObject<string>, setter: (value: string) => void) => 
    (e: React.ChangeEvent<HTMLTextAreaElement>) => setter(baseRef.current = e.target.value)

  const handleSubjectiveTranscript = createTranscriptHandler(subjectiveBaseRef, setSubjectiveReport)
  const handlePlanTranscript = createTranscriptHandler(planBaseRef, setPlan)
  const handleSubjectiveChange = createTextChangeHandler(subjectiveBaseRef, setSubjectiveReport)
  const handlePlanChange = createTextChangeHandler(planBaseRef, setPlan)

  const pullFromTherapyNotes = useCallback(async () => {
    try {
      const res = await fetch(`/api/therapynotes/get-note/${sessionId}`)
      if (!res.ok) return
      const { data } = await res.json()
      
      // Pull diagnosis
      const dx = data?.diagnoses || []
      if (dx.length > 0) {
        setDiagnosisCode(dx[0].code || '')
        setDiagnosisDescription(dx[0].description || '')
        setAdditionalDiagnoses(dx.slice(1))
      }
      
      // Pull treatment objectives
      type TNObjective = { Id: number; TreatmentObjectiveDescription: string }
      const rawObjectives: unknown[] = Array.isArray(data?.objectives) ? (data.objectives as unknown[]) : []
      const detailed: TNObjective[] = rawObjectives
        .map((o) => {
          const obj = o as { Id?: number; TreatmentObjectiveDescription?: string }
          return {
            Id: Number(obj.Id || 0),
            TreatmentObjectiveDescription: String(obj.TreatmentObjectiveDescription || '')
          }
        })
        .filter((o) => o.Id > 0 && o.TreatmentObjectiveDescription.trim())
      if (detailed.length > 0) setTreatmentObjectivesDetailed(detailed)
      
      // Pull prescribed frequency
      if (data?.prescribedFrequency) {
        setPrescribedFrequency(data.prescribedFrequency)
      }
      
      if (dx.length > 0 || detailed.length > 0) setTnPrefilled(true)
    } catch {
      // no-op
    }
  }, [sessionId])

  useEffect(() => {
    // Reset voice base refs on navigation
    subjectiveBaseRef.current = ''
    planBaseRef.current = ''
    
    fetch(`/api/sessions/${sessionId}`)
      .then(res => res.json())
      .then(({ data }) => setSession(data))
      .catch(() => {})
    
    fetch(`/api/notes/${sessionId}`)
      .then(res => res.json())
      .then(({ data }) => {
        // If no saved content, pull from TherapyNotes and stop
        if (!data?.content) {
          if (!didAutoPullRef.current) {
            didAutoPullRef.current = true
            pullFromTherapyNotes()
          }
          return
        }
        
        // Saved content exists - load everything from Supabase
        const content = data.content as ProgressNoteContent
        
        // Load billing codes (legacy support for old format)
        if (content.billingCodes) {
          const codes = content.billingCodes.map((c: { text: string }) => c.text)
          setQuestions(prev => prev.map(q => ({ ...q, answer: codes.includes(q.note) })))
        }
        
        // Load crisis session duration
        if (content.crisisSessionDuration) {
          setCrisisSessionDuration(content.crisisSessionDuration)
        }
        
        // Load diagnosis
        if (content.diagnosis) {
          setDiagnosisCode(content.diagnosis.code || '')
          setDiagnosisDescription(content.diagnosis.description || '')
        }
        if (content.diagnoses) {
          setAdditionalDiagnoses(content.diagnoses)
        }
        if (content.treatmentObjectivesDetailed) setTreatmentObjectivesDetailed(content.treatmentObjectivesDetailed)
        
        // Load mental status
        if (content.mentalStatus) {
           setMentalStatus({ ...content.mentalStatus })
          // Compute All Normal state from actual field values
          const allNormal = MENTAL_STATUS_FIELDS.every(
            field => content.mentalStatus![field.key] === NORMAL_VALUES[field.key]
          )
          setMentalStatusAllNormal(allNormal)
        }
        
        // Load risk assessment
        if (content.riskAssessment) {
          setPatientDeniesRisk(content.riskAssessment.patientDeniesRisk)
          setRiskAssessment({
            areaOfRisk: content.riskAssessment.areaOfRisk || '',
            levelOfRisk: content.riskAssessment.levelOfRisk || '',
            intentToAct: content.riskAssessment.intentToAct || '',
            planToAct: content.riskAssessment.planToAct || '',
            meansToAct: content.riskAssessment.meansToAct || '',
            riskFactors: content.riskAssessment.riskFactors || '',
            protectiveFactors: content.riskAssessment.protectiveFactors || '',
            additionalDetails: content.riskAssessment.additionalDetails || ''
          })
        }
        
        // Load clinical content
        if (content.medications) setMedications(content.medications)
        if (content.subjectiveReport) {
          subjectiveBaseRef.current = content.subjectiveReport
          setSubjectiveReport(content.subjectiveReport)
        }
        if (content.objectiveContent) setObjectiveContent(content.objectiveContent)
        if (content.interventions) setInterventions(content.interventions)
        if (content.treatmentProgress) setTreatmentProgress(content.treatmentProgress)
        if (content.assessment) setAssessment(content.assessment)
        if (content.plan) {
          planBaseRef.current = content.plan
          setPlan(content.plan)
        }
        
        // Load recommendation & frequency
        if (content.recommendation) {
          setRecommendation(content.recommendation.type)
          setPrescribedFrequency(content.recommendation.prescribedFrequency)
        }
      })
  }, [sessionId, pullFromTherapyNotes])

  useEffect(() => {
    if (!session) return
    try {
      const sessionStart = new Date(`${session.date}T${session.start_time}`)
      if (sessionStart.getTime() > Date.now()) {
        router.push('/calendar')
      }
    } catch {
      // no-op
    }
  }, [session, router])

  

  const toggle = (id: string) => {
    setQuestions(prev => {
      const q = prev.find(x => x.id === id)
      if (!q) return prev
      
      const newQuestions = prev.map(x => 
        x.id === id ? { ...x, answer: !x.answer } : 
        x.code === q.code ? { ...x, answer: false } : x
      )
      
      setAssessment(curr => {
        // If deselecting (was selected), remove the note
        if (q.answer) {
          return curr.replace(q.note, '').replace(/\n\n\n+/g, '\n\n').trim()
        }
        
        // If selecting, check if note already exists to prevent duplicates
        if (curr.includes(q.note)) {
          return curr
        }
        
        // Check if another question with same code was selected and replace it
        const otherDeselected = prev.find(x => x.code === q.code && x.id !== id && x.answer)
        if (otherDeselected) {
          return curr.replace(otherDeselected.note, q.note).trim()
        }
        
        // Append the new note
        return curr ? `${curr}\n\n${q.note}` : q.note
      })
      
      return newQuestions
    })
  }

  const toggleIntervention = (intervention: string) => {
    setInterventions(prev => prev.includes(intervention) ? prev.filter(i => i !== intervention) : [...prev, intervention])
  }

  const toggleAllNormal = () => {
    if (mentalStatusAllNormal) {
       setMentalStatus({ ...NOT_ASSESSED_VALUES })
      setMentalStatusAllNormal(false)
    } else {
       setMentalStatus({ ...NORMAL_VALUES })
      setMentalStatusAllNormal(true)
    }
  }

  const updateMentalStatus = (key: string, value: string) => {
     setMentalStatus(prev => {
       const next = { ...prev, [key]: value }
       const allNormal = MENTAL_STATUS_FIELDS.every(
         field => next[field.key] === NORMAL_VALUES[field.key]
       )
       setMentalStatusAllNormal(allNormal)
       return next
     })
  }

  const save = async () => {
    // Validation
    if (treatmentObjectivesDetailed.length > 0 && !treatmentProgress) {
      setValidationError('Please select Progress under Treatment Plan Progress.')
      return
    }

    if (!plan.trim()) {
      setValidationError('Please enter a Plan before saving the progress note.')
      return
    }

    if (!patientDeniesRisk) {
      const riskFieldsComplete =
        !!riskAssessment.areaOfRisk.trim() &&
        !!riskAssessment.levelOfRisk &&
        !!riskAssessment.intentToAct &&
        !!riskAssessment.planToAct &&
        !!riskAssessment.meansToAct

      if (!riskFieldsComplete) {
        setValidationError('Please complete the Risk Assessment section or confirm patient denies all areas of risk.')
        return
      }
    }

    setValidationError(null)
    setSaving(true)
    
    // Collect all progress note data
    const selectedBillingCodes = questions.filter(q => q.answer)
    const content: ProgressNoteContent = {
      billingCodes: selectedBillingCodes.map(q => ({ code: q.code, text: q.note })),
      diagnosis: diagnosisCode || diagnosisDescription ? { code: diagnosisCode, description: diagnosisDescription } : undefined,
      diagnoses: additionalDiagnoses.length > 0 ? additionalDiagnoses : undefined,
      treatmentObjectivesDetailed: treatmentObjectivesDetailed.length > 0 ? treatmentObjectivesDetailed : undefined,
      mentalStatus,
      riskAssessment: {
        patientDeniesRisk,
        ...(!patientDeniesRisk && riskAssessment)
      },
      medications: medications || undefined,
      subjectiveReport: subjectiveReport || undefined,
      objectiveContent: objectiveContent || undefined,
      interventions: interventions.length > 0 ? interventions : undefined,
      treatmentProgress: treatmentProgress || undefined,
      assessment: assessment || undefined,
      plan: plan || undefined,
      recommendation: { type: recommendation, prescribedFrequency },
      crisisSessionDuration: selectedBillingCodes.some(q => q.code === '90840') ? crisisSessionDuration : undefined
    }
    
    await fetch(`/api/notes/${sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content })
    })
    
    // Navigate to the next session if available; otherwise go back to calendar
    try {
      const res = await fetch('/api/sessions')
      if (!res.ok || !session) {
        router.push('/calendar')
        return
      }
      const { data }: { data: Session[] } = await res.json()
      if (!data) {
        router.push('/calendar')
        return
      }

      const currentDateTime = new Date(`${session.date}T${session.start_time}`)
      const now = new Date()
      const nextUnwritten = data
        .filter(s => s.id !== session.id)
        .filter(s => new Date(`${s.date}T${s.start_time}`).getTime() > currentDateTime.getTime())
        .sort((a, b) => new Date(`${a.date}T${a.start_time}`).getTime() - new Date(`${b.date}T${b.start_time}`).getTime())
        .find(s => new Date(`${s.date}T${s.start_time}`).getTime() <= now.getTime())

      if (nextUnwritten) {
        router.push(`/notes/${nextUnwritten.id}`)
      } else {
        router.push('/calendar')
      }
    } catch {
      router.push('/calendar')
    }
  }

  const formatSessionDateTime = () => {
    if (!session) return ''
    const date = new Date(`${session.date}T00:00:00`)
    return `${date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} ${formatTime(session.start_time)} - ${formatTime(session.end_time)}`
  }

  const calculateDuration = () => {
    if (!session) return '0 minutes'
    const start = new Date(`2000-01-01 ${session.start_time}`)
    const end = new Date(`2000-01-01 ${session.end_time}`)
    return `${(end.getTime() - start.getTime()) / 60000} minutes`
  }

  return (
    <div className="container mx-auto px-4 max-w-6xl py-8">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/calendar')}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Back to calendar"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 19l-7-7 7-7" />
              </svg>
            </Button>
            <h1 className="text-3xl font-bold">Progress Note</h1>
          </div>
            {tnPrefilled && (
              <span className="text-xs text-muted-foreground">Prefilled from TherapyNotes</span>
            )}
          </div>
          
          <div className="space-y-6 mb-6">
                {/* Session Info */}
                <div className="bg-muted/50 p-4 rounded-lg border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
                    <div className="flex gap-3"><span className="text-sm font-medium min-w-[100px]">Client:</span><span className="text-sm">{session?.clients?.name || 'Loading...'}</span></div>
                    <div className="flex gap-3"><span className="text-sm font-medium min-w-[100px]">Date and Time:</span><span className="text-sm">{formatSessionDateTime()}</span></div>
                    <div className="flex gap-3"><span className="text-sm font-medium min-w-[100px]">Duration:</span><span className="text-sm">{calculateDuration()}</span></div>
                    <div className="flex gap-3"><span className="text-sm font-medium min-w-[100px]">Service Code:</span><span className="text-sm">{serviceCodes}</span></div>
                    <div className="flex gap-3"><span className="text-sm font-medium min-w-[100px]">Location:</span><span className="text-sm">Main Office</span></div>
                  </div>
                </div>

                {/* Diagnosis */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Diagnosis</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <Label className="text-sm font-medium sm:min-w-[120px]">Code:</Label>
                      <Input value={diagnosisCode} onChange={(e) => setDiagnosisCode(e.target.value)} placeholder="e.g., F10.20" className="flex-1" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <Label className="text-sm font-medium sm:min-w-[120px]">Description:</Label>
                      <Input value={diagnosisDescription} onChange={(e) => setDiagnosisDescription(e.target.value)} placeholder="e.g., Alcohol Use Disorder" className="flex-1" />
                    </div>
                  </div>
                  {additionalDiagnoses.map((dx, idx) => (
                    <div key={`additional-${idx}`} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <Label className="text-sm font-medium sm:min-w-[120px]">Code:</Label>
                        <Input 
                          value={dx.code} 
                          onChange={(e) => {
                            const newAdditional = [...additionalDiagnoses]
                            newAdditional[idx] = { ...dx, code: e.target.value }
                            setAdditionalDiagnoses(newAdditional)
                          }} 
                          placeholder="e.g., F10.20" 
                          className="flex-1" 
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <Label className="text-sm font-medium sm:min-w-[120px]">Description:</Label>
                        <Input 
                          value={dx.description} 
                          onChange={(e) => {
                            const newAdditional = [...additionalDiagnoses]
                            newAdditional[idx] = { ...dx, description: e.target.value }
                            setAdditionalDiagnoses(newAdditional)
                          }} 
                          placeholder="e.g., Alcohol Use Disorder" 
                          className="flex-1" 
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Current Mental Status */}
                <div className="space-y-4">
                   <div className="flex items-center justify-between">
                     <Label className="text-base font-semibold">Current Mental Status</Label>
                     <Button variant="outline" size="sm" onClick={toggleAllNormal}>
                       {mentalStatusAllNormal ? 'Set All Not Assessed' : 'Set All Normal'}
                     </Button>
                  </div>
                  <div className="bg-muted/30 p-4 md:p-5 rounded-lg border">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-4">
                      {MENTAL_STATUS_FIELDS.map(field => (
                        <div key={field.key} className="flex flex-col lg:flex-row lg:items-center gap-2 lg:gap-4">
                          <Label className="text-sm font-medium leading-tight lg:w-[190px] lg:flex-shrink-0">{field.label}:</Label>
                          <div className="w-full">
                            <select
                              value={mentalStatus[field.key]}
                              onChange={(e) => updateMentalStatus(field.key, e.target.value)}
                              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                            >
                              {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Risk Assessment */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Risk Assessment *</Label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={patientDeniesRisk} onChange={(e) => setPatientDeniesRisk(e.target.checked)} className="w-4 h-4 cursor-pointer" />
                    <span className="text-sm cursor-pointer hover:text-primary transition-colors">Patient denies all areas of risk. No contrary clinical indications present.</span>
                  </label>
                  {!patientDeniesRisk && (
                    <div className="space-y-4 bg-muted/50 p-4 rounded-lg border">
                      <SuggestionField
                        options={AREA_OF_RISK_OPTIONS}
                        value={riskAssessment.areaOfRisk}
                        onChange={(val) => setRiskAssessment(prev => ({ ...prev, areaOfRisk: val }))}
                        placeholder="Enter area of risk..."
                        label="Area of Risk *"
                      />
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div><Label className="text-sm font-medium mb-2 block">Level of Risk *</Label><RadioGroup name="levelOfRisk" options={['Low', 'Medium', 'High', 'Imminent']} value={riskAssessment.levelOfRisk} onChange={(val) => setRiskAssessment(prev => ({ ...prev, levelOfRisk: val }))} /></div>
                        <div><Label className="text-sm font-medium mb-2 block">Intent to Act *</Label><RadioGroup name="intentToAct" options={['Yes', 'No', 'Not Applicable']} value={riskAssessment.intentToAct} onChange={(val) => setRiskAssessment(prev => ({ ...prev, intentToAct: val }))} /></div>
                        <div><Label className="text-sm font-medium mb-2 block">Plan to Act *</Label><RadioGroup name="planToAct" options={['Yes', 'No', 'Not Applicable']} value={riskAssessment.planToAct} onChange={(val) => setRiskAssessment(prev => ({ ...prev, planToAct: val }))} /></div>
                        <div><Label className="text-sm font-medium mb-2 block">Means to Act *</Label><RadioGroup name="meansToAct" options={['Yes', 'No', 'Not Applicable']} value={riskAssessment.meansToAct} onChange={(val) => setRiskAssessment(prev => ({ ...prev, meansToAct: val }))} /></div>
                      </div>
                      <SuggestionField
                        options={RISK_FACTORS_OPTIONS}
                        value={riskAssessment.riskFactors}
                        onChange={(val) => setRiskAssessment(prev => ({ ...prev, riskFactors: val }))}
                        placeholder="Enter risk factors..."
                        label="Risk Factors"
                      />
                      <SuggestionField
                        options={PROTECTIVE_FACTORS_OPTIONS}
                        value={riskAssessment.protectiveFactors}
                        onChange={(val) => setRiskAssessment(prev => ({ ...prev, protectiveFactors: val }))}
                        placeholder="Enter protective factors..."
                        label="Protective Factors"
                      />
                      <div><Label className="text-sm font-medium mb-2">Additional Details</Label><Textarea value={riskAssessment.additionalDetails} onChange={(e) => setRiskAssessment(prev => ({ ...prev, additionalDetails: e.target.value }))} rows={2} className="resize-none" /></div>
                    </div>
                  )}
                </div>

                {/* Medications */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Medications</Label>
                  <Textarea value={medications} onChange={(e) => setMedications(e.target.value)} placeholder="Document medications, changes, and dosages discussed" rows={3} className="resize-none" />
                </div>

                {/* Subjective Report */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <Label className="text-base font-semibold">
                      Subjective Report and Symptom Description
                    </Label>
                    <VoiceInputButton id="subjective" onTranscript={handleSubjectiveTranscript} />
                  </div>
                  <Textarea
                    value={subjectiveReport}
                    onChange={handleSubjectiveChange}
                    placeholder="Subjective information discussed in session"
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Objective Content */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Objective Content</Label>
                  <Textarea value={objectiveContent} onChange={(e) => setObjectiveContent(e.target.value)} placeholder="Objective information discussed during the session" rows={4} className="resize-none" />
                </div>

                {/* Interventions Used */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Interventions Used</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2">
                    {INTERVENTION_OPTIONS.map(intervention => (
                      <label key={intervention} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                        <input type="checkbox" checked={interventions.includes(intervention)} onChange={() => toggleIntervention(intervention)} className="w-4 h-4 cursor-pointer" />
                        <span className="text-sm">{intervention}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Treatment Plan Progress */}
                {treatmentObjectivesDetailed.length > 0 && (
                  <div className="space-y-3">
                    <Label className="text-base font-semibold">Treatment Plan Progress</Label>
                    <div className="bg-muted/50 p-4 rounded-lg border space-y-3">
                      <div>
                        <p className="text-sm font-semibold mb-2">Objectives</p>
                        <ol className="list-decimal pl-5 space-y-1">
                          {treatmentObjectivesDetailed.map((obj, idx) => (
                            <li key={`${idx}-${obj.TreatmentObjectiveDescription.substring(0, 12)}`} className="text-sm text-muted-foreground whitespace-pre-line">{stripHtml(obj.TreatmentObjectiveDescription)}</li>
                          ))}
                        </ol>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                        <Label className="text-sm sm:whitespace-nowrap sm:min-w-[80px]">Progress: *</Label>
                        <select value={treatmentProgress} onChange={(e) => setTreatmentProgress(e.target.value)} className="w-auto min-w-[200px] h-10 px-3 rounded-md border border-input bg-background text-sm">
                          <option value="">Select progress...</option>
                          {['Improved', 'Progressing', 'Maintained', 'No Progress', 'Regressed', 'Variable', 'Deferred', 'Not Addressed', 'On Hold', 'Completed'].map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* Add-on Codes */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Add-on Codes</Label>
                    <p className="text-sm text-muted-foreground mt-1">If you would answer &quot;Yes&quot; to any of these questions, select it to automatically add the proper documentation to your note.</p>
                  </div>
                  
                  {/* Interactive Complexity */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50 flex items-center justify-between border-b">
                      <span className="font-medium text-sm">Interactive Complexity +90785</span>
                      <span className="bg-success/10 text-success border border-success/30 px-3 py-1 rounded-full text-xs font-bold">
                        +$12.96
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {questions.filter(q => q.code === '90785').map(q => (
                        <div key={q.id} className="flex items-start gap-3 cursor-pointer p-3 hover:bg-muted/30 rounded" onClick={() => toggle(q.id)}>
                          <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${q.answer ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                            {q.answer && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                          <span className="text-sm flex-1">{q.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* After Hours */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50 flex items-center justify-between border-b">
                      <span className="font-medium text-sm">After Hours +99050</span>
                      <span className="bg-success/10 text-success border border-success/30 px-3 py-1 rounded-full text-xs font-bold">
                        +$16.58
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {questions.filter(q => q.code === '99050').map(q => (
                        <div key={q.id} className="flex items-start gap-3 cursor-pointer p-3 hover:bg-muted/30 rounded" onClick={() => toggle(q.id)}>
                          <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${q.answer ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                            {q.answer && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                          <span className="text-sm flex-1">{q.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crisis Psychotherapy */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50 flex items-center justify-between border-b">
                      <span className="font-medium text-sm">Crisis Psychotherapy 90839</span>
                      <span className="bg-success/10 text-success border border-success/30 px-3 py-1 rounded-full text-xs font-bold">
                        $127.62
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {questions.filter(q => q.code === '90839').map(q => (
                        <div key={q.id} className="flex items-start gap-3 cursor-pointer p-3 hover:bg-muted/30 rounded" onClick={() => toggle(q.id)}>
                          <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${q.answer ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                            {q.answer && <div className="w-2 h-2 rounded-full bg-white"></div>}
                          </div>
                          <span className="text-sm flex-1">{q.text}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Crisis Psychotherapy Add-on */}
                  <div className="border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50 flex items-center justify-between border-b">
                      <span className="font-medium text-sm">Crisis Psychotherapy Extended +90840</span>
                      <span className="bg-success/10 text-success border border-success/30 px-3 py-1 rounded-full text-xs font-bold">
                        +$63.21
                      </span>
                    </div>
                    <div className="p-4 space-y-2">
                      {questions.filter(q => q.code === '90840').map(q => (
                        <div key={q.id}>
                          <div className="flex items-start gap-3 cursor-pointer p-3 hover:bg-muted/30 rounded" onClick={() => toggle(q.id)}>
                            <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${q.answer ? 'border-primary bg-primary' : 'border-muted-foreground'}`}>
                              {q.answer && <div className="w-2 h-2 rounded-full bg-white"></div>}
                            </div>
                            <span className="text-sm flex-1">{q.text}</span>
                          </div>
                          {q.answer && (
                            <div className="ml-7 mt-2 flex items-center gap-2">
                              <Label className="text-sm">Session duration (minutes):</Label>
                              <Input
                                type="number"
                                min="76"
                                value={crisisSessionDuration}
                                onChange={(e) => setCrisisSessionDuration(parseInt(e.target.value) || 75)}
                                className="w-20"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Assessment */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Assessment / Additional Notes</Label>
                  <Textarea value={assessment} onChange={(e) => setAssessment(e.target.value)} placeholder="Response to interventions, prognosis, case conceptualization, etc." rows={4} className="resize-none" />
                </div>

                {/* Plan */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <Label className="text-base font-semibold">Plan *</Label>
                    <div className="flex gap-2">
                      <VoiceInputButton id="plan" onTranscript={handlePlanTranscript} />
                      {session?.client_id && (
                        <PlanHistoryButton
                          clientId={session.client_id}
                          currentSessionId={sessionId as string}
                          onSelect={(val) => { planBaseRef.current = val; setPlan(val) }}
                        />
                      )}
                    </div>
                  </div>
                  <Textarea 
                    value={plan} 
                    onChange={handlePlanChange}
                    placeholder="Next steps in the treatment process" 
                    rows={4} 
                    className="resize-none" 
                  />
                </div>

                {/* Recommendation */}
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Recommendation</Label>
                  <div className="bg-muted/50 p-4 rounded-lg border">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        {[{ value: 'continue', label: 'Continue current therapeutic focus' }, { value: 'change', label: 'Change treatment goals or objectives' }, { value: 'terminate', label: 'Terminate treatment' }].map(opt => (
                          <label key={opt.value} className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors">
                            <input type="radio" name="recommendation" value={opt.value} checked={recommendation === opt.value} onChange={() => setRecommendation(opt.value)} className="w-4 h-4" />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        ))}
                      </div>
                      {recommendation !== 'terminate' && (
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3">
                          <Label className="text-sm md:whitespace-nowrap">Prescribed Frequency of Treatment *</Label>
                          <div className="w-full md:flex-1 md:min-w-0">
                            <select 
                              value={prescribedFrequency} 
                              onChange={(e) => setPrescribedFrequency(e.target.value)}
                              className="w-full h-10 px-3 rounded-md border border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px]"
                            // className="w-auto min-w-[200px] h-10 px-3 rounded-md border border-input bg-transparent text-sm shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-[2px]"
                            >
                            <option value="As Needed">As Needed</option>
                            <option value="Twice a Week">Twice a Week</option>
                            <option value="Weekly">Weekly</option>
                            <option value="Every 2 Weeks">Every 2 Weeks</option>
                            <option value="Every 4 Weeks">Every 4 Weeks</option>
                            <option value="Every Month">Every Month</option>
                            <option value="Every 2 Months">Every 2 Months</option>
                            <option value="Every 3 Months">Every 3 Months</option>
                            <option value="Every 4 Months">Every 4 Months</option>
                          </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
          </div>
          
          {validationError && (
            <div className="mb-4 p-3 rounded border border-red-300 bg-red-50 text-red-900 text-sm">
              {validationError}
            </div>
          )}
          <Button onClick={save} disabled={saving} size="lg" className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save & Next'}
          </Button>
        </div>
  )
}
