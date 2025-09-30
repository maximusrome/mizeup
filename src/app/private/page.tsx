'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
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

export default function DashboardPage() {
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q1',
      text: 'Was there another person besides the client that attended (such as a parent, partner, etc.) that may have increased the communication complexity of the session?',
      answer: null,
      code: '90785',
      reimbursement: '$12.96',
      description: 'Interactive Complexity',
      objectiveText: 'Interactive complexity present due to third party involvement requiring management of communication barriers and coordination of care between multiple participants during therapeutic intervention.'
    },
    {
      id: 'q2', 
      text: 'Did you use play therapy techniques and deem them necessary to make progress in the session?',
      answer: null,
      code: '90785',
      reimbursement: '$12.96',
      description: 'Interactive Complexity (Play Therapy)',
      objectiveText: 'Interactive complexity present due to utilization of play therapy techniques requiring specialized therapeutic communication methods and age-appropriate intervention strategies to facilitate therapeutic progress.'
    },
    {
      id: 'q3',
      text: 'Did the session occur outside your regular office hours?',
      answer: null,
      code: '99050',
      reimbursement: '$8.45',
      description: 'After Hours Service',
      objectiveText: 'Services provided outside of regularly scheduled office hours to accommodate client scheduling needs and ensure continuity of care.'
    }
  ])

  const handleAnswer = (questionId: string, answer: boolean) => {
    setQuestions(prev => 
      prev.map(q => 
        q.id === questionId ? { ...q, answer } : q
      )
    )
  }

  const resetAnswers = () => {
    setQuestions(prev => 
      prev.map(q => ({ ...q, answer: null }))
    )
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      // You could add a toast notification here
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const getSelectedCodes = () => {
    return questions.filter(q => q.answer === true)
  }

  const getTotalReimbursement = () => {
    const selectedCodes = getSelectedCodes()
    const total = selectedCodes.reduce((sum, q) => {
      const amount = parseFloat(q.reimbursement.replace('$', ''))
      return sum + amount
    }, 0)
    return total.toFixed(2)
  }

  return (
    <div className="min-h-screen bg-background">
      <PrivateNavbar />
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Maximize Your Insurance Reimbursement
            </h1>
            <p className="text-lg text-muted-foreground">
              Answer these questions to identify additional billing codes that can increase your reimbursement.
            </p>
          </div>
        
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Session Assessment Questions</CardTitle>
              <CardDescription>
                Select Yes or No for each question based on your recent therapy session.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <span className="flex-shrink-0 w-8 h-8 bg-primary/10 text-primary rounded-full flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </span>
                    <p className="text-sm font-medium leading-relaxed pt-1">
                      {question.text}
                    </p>
                  </div>
                  <div className="ml-11 space-y-3">
                    <div className="flex space-x-3">
                      <Button
                        variant={question.answer === true ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAnswer(question.id, true)}
                        className="min-w-16"
                      >
                        Yes
                      </Button>
                      <Button
                        variant={question.answer === false ? "default" : "outline"}
                        size="sm"
                        onClick={() => handleAnswer(question.id, false)}
                        className="min-w-16"
                      >
                        No
                      </Button>
                    </div>
                    
                    {question.answer === true && (
                      <div className="bg-success-light border border-success rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-success">Code: {question.code}</span>
                            <span className="mx-2 text-success">•</span>
                            <span className="text-success">{question.description}</span>
                          </div>
                          <span className="font-bold text-success">{question.reimbursement}</span>
                        </div>
                        
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-success">Copy for TherapyNotes Objective:</p>
                          <div className="bg-card border border-success rounded p-3 text-sm">
                            <p className="text-foreground leading-relaxed">{question.objectiveText}</p>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyToClipboard(question.objectiveText)}
                            className="text-success border-success hover:bg-success-light"
                          >
                            Copy Text
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              <div className="pt-4 border-t flex justify-between items-center">
                <Button variant="ghost" onClick={resetAnswers}>
                  Reset All
                </Button>
                <Button 
                  disabled={questions.some(q => q.answer === null)}
                  className="min-w-32"
                >
                  Generate Codes
                </Button>
              </div>
            </CardContent>
          </Card>

          {getSelectedCodes().length > 0 && (
            <Card className="bg-success-light border-success">
              <CardHeader>
                <CardTitle className="text-success">Additional Revenue Summary</CardTitle>
                <CardDescription className="text-success">
                  Based on your responses, you can add these billing codes to increase your reimbursement.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getSelectedCodes().map((question) => (
                    <div key={question.id} className="flex justify-between items-center py-2 border-b border-success last:border-b-0">
                      <div>
                        <span className="font-semibold text-success">Code {question.code}</span>
                        <span className="mx-2 text-success">•</span>
                        <span className="text-success">{question.description}</span>
                      </div>
                      <span className="font-bold text-success">{question.reimbursement}</span>
                    </div>
                  ))}
                  
                  <div className="pt-4 border-t border-success">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-success">Total Additional Revenue:</span>
                      <span className="text-xl font-bold text-success">${getTotalReimbursement()}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
