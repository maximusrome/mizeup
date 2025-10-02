'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import PrivateNavbar from '@/components/PrivateNavbar'

interface Question {
  id: string
  text: string
  answer: boolean | null
  code: string
  reimbursement: string
  description: string
  objectiveText: string
}

// Constants
const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    text: 'Did you need to manage maladaptive communication (related to, e.g., high anxiety, high reactivity, repeated questions, or disagreement) among participants that complicates delivery of care?',
    answer: null,
    code: '90785',
    reimbursement: '$12.96',
    description: 'Interactive Complexity (Maladaptive Communication)',
    objectiveText: 'Managed maladaptive communication among participants, such as high anxiety, reactivity, repeated questions, or disagreement. This complicated care delivery by impeding therapeutic engagement. Interventions included de-escalation techniques, clarification, and redirection to facilitate session progress.'
  },
  {
    id: 'q2', 
    text: 'Did the caregiver\'s emotions/behavior interfere with implementation of the treatment plan?',
    answer: null,
    code: '90785',
    reimbursement: '$12.96',
    description: 'Interactive Complexity (Caregiver Interference)',
    objectiveText: 'Caregiver emotions and behaviors, such as agitation or disagreement with the plan, interfered with treatment implementation by disrupting focus. Interventions included addressing concerns, mediating dynamics, and refocusing on goals to enable effective care.'
  },
  {
    id: 'q3',
    text: 'Was there evidence/disclosure of a sentinel event and mandated report to a third party (e.g., abuse or neglect with report to state agency) with initiation of discussion of the sentinel event and/or report with patient and other visit participants?',
    answer: null,
    code: '90785',
    reimbursement: '$12.96',
    description: 'Interactive Complexity (Sentinel Event)',
    objectiveText: 'Evidence or disclosure of a sentinel event, such as abuse or neglect, required a mandated report to a third party like a state agency. Discussion of the event and report process involved the patient and participants. This complicated care delivery by shifting focus to crisis response. Interventions included explaining obligations, providing support, and integrating into the plan.'
  },
  {
    id: 'q4',
    text: 'Did you use play equipment, physical devices, interpreter, or translator to overcome significant language barriers?',
    answer: null,
    code: '90785',
    reimbursement: '$12.96',
    description: 'Interactive Complexity (Overcoming Barriers)',
    objectiveText: 'Used play equipment, physical devices, interpreter, or translator to overcome significant language or communication barriers due to the patient\'s limited skills. This complicated care delivery by requiring adapted interaction methods. Interventions included employing these tools to ensure engagement and comprehension.'
  },
  {
    id: 'q5',
    text: 'Was the service provided in the office at times other than regularly scheduled office hours, or days when the office is normally closed (e.g., holidays, Saturday or Sunday), in addition to basic service?',
    answer: null,
    code: '99050',
    reimbursement: '$16.58',
    description: 'After Hours Service',
    objectiveText: 'This session was provided in the office outside the practice\'s regularly scheduled office hours of Monday-Friday 9:00 AM-5:00 PM, thereby meeting criteria for add-on code 99050.'
  }
]

// Helper Components
const InstructionsSection = ({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) => (
  <div className="border rounded-lg">
    <button 
      onClick={onToggle}
      className="w-full px-4 py-3 flex items-center justify-between bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-t-lg"
    >
      <span className="font-medium">Instructions</span>
      <span className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
    </button>
    {isOpen && (
      <div className="p-4 space-y-3">
        {[
          'Answer the questions below for each TherapyNotes progress note',
          'For each &quot;Yes&quot; answer, add the billing code as an add-on to your service code',
          'Copy and paste the documentation into Assessments/Additional Notes section',
          'Complete your progress note as you normally would'
        ].map((instruction, index) => (
          <div key={index} className="flex items-center space-x-3">
            <span className="flex-shrink-0 w-6 h-6 bg-muted text-muted-foreground rounded-full flex items-center justify-center text-sm font-medium">
              {index + 1}
            </span>
            <p className="text-sm text-foreground">{instruction}</p>
          </div>
        ))}
      </div>
    )}
  </div>
)

const QuestionItem = ({ 
  question, 
  onToggle 
}: { 
  question: Question; 
  onToggle: () => void 
}) => (
  <div>
    <div 
      className="flex items-start gap-3 cursor-pointer p-3 hover:bg-muted/30 rounded"
      onClick={onToggle}
    >
      <div className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
        question.answer === true 
          ? 'border-primary bg-primary' 
          : 'border-muted-foreground'
      }`}>
        {question.answer === true && (
          <div className="w-2 h-2 rounded-full bg-white"></div>
        )}
      </div>
      <span className="text-sm text-foreground flex-1">{question.text}</span>
    </div>
    
    {question.answer === true && (
      <div className="ml-6 mb-2">
        <div className="bg-muted/30 border border-success/30 rounded-lg p-3 mb-2">
          <p className="text-sm text-foreground">{question.objectiveText}</p>
        </div>
        <p className="text-sm text-success font-medium ml-3">Ready to paste</p>
      </div>
    )}
  </div>
)

const CollapsibleSection = ({ 
  title, 
  reimbursement, 
  isOpen, 
  onToggle, 
  children 
}: { 
  title: string; 
  reimbursement: string; 
  isOpen: boolean; 
  onToggle: () => void; 
  children: React.ReactNode 
}) => (
  <div className="border rounded-lg">
    <button 
      onClick={onToggle}
      className="w-full px-4 py-3 flex items-center justify-between bg-primary text-primary-foreground hover:bg-primary/90 transition-colors rounded-t-lg"
    >
      <div className="flex items-center justify-between w-full">
        <span className="font-semibold">{title}</span>
        <span className="bg-background text-success border border-success px-3 py-1 rounded-full text-sm font-bold">
          {reimbursement}
        </span>
      </div>
      <span className={`ml-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
    </button>
    
    {isOpen && (
      <div className="p-4">
        <div className="space-y-2">
          {children}
        </div>
      </div>
    )}
  </div>
)

export default function DashboardPage() {
  const [instructionsOpen, setInstructionsOpen] = useState(true)
  const [interactiveComplexityOpen, setInteractiveComplexityOpen] = useState(true)
  const [afterHoursOpen, setAfterHoursOpen] = useState(true)
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS)

  const handleQuestionToggle = (questionId: string) => {
    setQuestions(prev => 
      prev.map(q => {
        if (q.id === questionId) {
          // Toggle current question
          return { ...q, answer: q.answer === true ? null : true }
        } else {
          // Deselect all other questions
          return { ...q, answer: null }
        }
      })
    )
  }

  const handleQuestionSelect = (questionId: string) => {
    const question = questions.find(q => q.id === questionId)
    if (question) {
      handleQuestionToggle(questionId)
      if (question.answer !== true) {
        copyToClipboard(question.objectiveText)
      }
    }
  }

  const resetAnswers = () => {
    setQuestions(prev => 
      prev.map(q => ({ ...q, answer: null }))
    )
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch (err) {
      console.error('Failed to copy text: ', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      try {
        document.execCommand('copy')
      } catch (fallbackErr) {
        console.error('Fallback copy failed: ', fallbackErr)
      }
      document.body.removeChild(textArea)
    }
  }

  const interactiveComplexityQuestions = questions.filter(q => 
    q.id.startsWith('q') && parseInt(q.id.substring(1)) <= 4
  )
  
  const afterHoursQuestions = questions.filter(q => q.id === 'q5')

  return (
    <div className="min-h-screen bg-background">
      <PrivateNavbar />
      <div className="pt-20 pb-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6 space-y-4">
            <InstructionsSection 
              isOpen={instructionsOpen} 
              onToggle={() => setInstructionsOpen(!instructionsOpen)} 
            />

            <CollapsibleSection
              title="Interactive Complexity +90785"
              reimbursement="+$12.96"
              isOpen={interactiveComplexityOpen}
              onToggle={() => setInteractiveComplexityOpen(!interactiveComplexityOpen)}
            >
              {interactiveComplexityQuestions.map((question) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  onToggle={() => handleQuestionSelect(question.id)}
                />
              ))}
            </CollapsibleSection>

            <CollapsibleSection
              title="After Hours +99050"
              reimbursement="+$16.58"
              isOpen={afterHoursOpen}
              onToggle={() => setAfterHoursOpen(!afterHoursOpen)}
            >
              {afterHoursQuestions.map((question) => (
                <QuestionItem
                  key={question.id}
                  question={question}
                  onToggle={() => handleQuestionSelect(question.id)}
                />
              ))}
            </CollapsibleSection>
            
            <Button 
              disabled={!questions.some(q => q.answer === true)}
              onClick={resetAnswers}
              className="mt-4"
            >
              Done & Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}