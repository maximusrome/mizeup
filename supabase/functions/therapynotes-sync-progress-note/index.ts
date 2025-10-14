import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CONFIG = {
  cors: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36', 'Origin': 'https://www.therapynotes.com' },
  cookies: 'timezone-offset=-240; cookie-detection=1',
  rac: 'BfcAAAAAAAD2ZJ40MeN_Gk1SkcfxW0mJoaa6g0Dn4n6NQfPwUKKXEw',
  metadata: "eyJOb3RlVGVtcGxhdGVJZCI6IjUiLCJDdXN0b21Gb3JtSWQiOiIiLCJDdXN0b21Gb3JtVmVyc2lvbklkIjoiIiwiRm9ybUNvbnRleHQiOiIzIiwiQ2FsZW5kYXJFbnRyeUlkIjoiMTA5MDAzODI4NSIsIkdldE5vdGVSZXF1ZXN0Ijp7Ik5vdGVUeXBlIjo0LCJVc2VySWQiOjYzMjM3LCJQYXRpZW50SWQiOjIxOTA2OTcsIkNhbGVuZGFyRW50cnlJZCI6MTA5MDAzODI4NSwiTm90ZUlkIjpudWxsLCJOb3RlUmV2aXNpb24iOm51bGwsIklzRWRpdGluZyI6dHJ1ZSwiTm90ZVRlbXBsYXRlIjpudWxsLCJDdXN0b21Gb3JtSWQiOm51bGwsIkN1c3RvbUZvcm1WZXJzaW9uSWQiOm51bGwsIklwQWRkcmVzcyI6IjE3NC4xOTYuMTk3LjI0OCIsIldhc1NhdmVkIjpmYWxzZSwiSXNHcm91cE5vdGVXb3JrZmxvdyI6ZmFsc2V9fQbZETShBvcHiJvBvuruLQXsDevdZrAVJ0X6OWmwpgMl"
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CONFIG.cors })
  
  try {
    const { username, password, practiceCode, patientId, calendarEntryId, sessionDate, sessionStartTime, sessionDuration, progressNoteContent, clientName } = await req.json()
    
    const { accessToken, sessionId, userId, practiceId } = await loginToTherapyNotes(username, password, practiceCode)
    if (!accessToken) throw new Error('Login failed')
    
    const cookies = `${CONFIG.cookies}; access-token=${accessToken}; ASP.NET_SessionId=${sessionId}`
    
    let finalPatientId = patientId
    if (!finalPatientId && clientName) {
      const patient = await searchPatient(clientName, cookies)
      if (!patient) throw new Error(`Patient not found: ${clientName}`)
      finalPatientId = patient.ID
    }
    
    const content = progressNoteContent || {}
    const ms = content.mentalStatus || {}
    const rec = content.recommendation || {}
    const diagnoses = content.diagnoses || (content.diagnosis ? [content.diagnosis] : [{"Code":"F10.20","Description":"Alcohol Use Disorder, Severe"},{"Code":"F32.0","Description":"Major Depressive Disorder, Single episode, Mild"}])
    
    // Build service codes - always 90837, add 90785/99050 if billing codes selected
    const serviceCodes = [{"Id":4217196,"Code":"90837","Units":1,"IsAddOn":false}]
    if (content.billingCodes) {
      const codes = content.billingCodes.map((c: any) => c.code || c.text)
      if (codes.includes('90785')) serviceCodes.push({"Id":4105110,"Code":"90785","Units":1,"IsAddOn":true})
      if (codes.includes('99050')) serviceCodes.push({"Id":4183917,"Code":"99050","Units":1,"IsAddOn":true})
    }
    
    const payload = {
      FormData: {
        FormMetadata: {
          GetNoteRequest: { NoteType: 4, UserId: userId, PatientId: finalPatientId, CalendarEntryId: calendarEntryId, IsEditing: true, IpAddress: "174.196.197.248", WasSaved: false, IsGroupNoteWorkflow: false },
          NoteVersion: 5, NoteTemplateId: 5, OwnershipWillBeUpdatedOnSave: false, FormContext: 3, Locale: 1033, PracticeId: practiceId, PatientId: finalPatientId, UserId: userId, CalendarEntryClinicianId: userId,
          CalendarEntryId: calendarEntryId,
          PracticeSignatureContext: { PendingPracticeSignatureType: 1, CurrentUserCanSign: true, RequiresSupervisorSignature: false, SupervisorReviewStatus: 4, DefaultLicenseInfo: { SignerDisplayName: "Lauren Goorno,LICSW, Therapist, License #110916" } }, DsmVersion: 0
        },
        EncryptedFormMetadata: CONFIG.metadata,
        FormMacros: {},
        FormHeaderData: {
          Title: "Progress Note", DateAndTime: `${sessionDate}T${sessionStartTime}`, AppointmentDate: `${sessionDate}T${sessionStartTime}`, AuthorUserId: userId, AuthorDisplayName: "Lauren Goorno,LICSW",
          SessionDuration: sessionDuration || 60, LocationType: 1, LocationId: 32291, ParticipantsType: 1, ServiceCodes: serviceCodes
        },
        FormElementValues: [
          { Value: { Orientation: ms.orientation || "X3: Oriented to Person, Place, and Time", Insights: ms.insights || "Excellent", GeneralAppearance: ms.generalAppearance || "Appropriate", JudgmentImpulseControl: ms.judgmentImpulse || "Excellent", Dress: ms.dress || "Appropriate", Memory: ms.memory || "Intact", MotorActivity: ms.motorActivity || "Unremarkable", AttentionConcentration: ms.attentionConcentration || "Good", InterviewBehavior: ms.interviewBehavior || "Appropriate", ThoughtProcess: ms.thoughtProcess || "Unremarkable", Speech: ms.speech || "Normal", ThoughtContent: ms.thoughtContent || "Appropriate", Mood: ms.mood || "Euthymic", Perception: ms.perception || "Unremarkable", Affect: ms.affect || "Congruent", FunctionalStatus: ms.functionalStatus || "Intact", CognitiveMentalStatus: "", InterpersonalMentalStatus: "" }, FormElementId: 13010, FormElementType: 1005 },
          { Value: { ParticipantsType: 1, PatientDeniesAllAreasOfRisk: true, RiskAssessments: [{ AreaOfRisk: "", LevelOfRisk: 0, IntentToAct: 0, PlanToAct: 0, MeansToAct: 0, RiskFactors: [], ProtectiveFactors: [], AdditionalDetails: "", NoSafetyIssues: null }] }, FormElementId: 13011, FormElementType: 1004 },
          { Value: content.medications || "", FormElementId: 13014, FormElementType: 26 },
          { Value: content.subjectiveReport || "", FormElementId: 13000, FormElementType: 26 },
          { Value: content.objectiveContent || "", FormElementId: 13001, FormElementType: 26 },
          { Value: { Interventions: content.interventions || [], Other: "" }, FormElementId: 13005, FormElementType: 1001 },
          { Value: content.assessment || "", FormElementId: 13002, FormElementType: 26 },
          { Value: content.plan || "", FormElementId: 13003, FormElementType: 26 },
          { Value: { Recommendation: rec.type === 'continue' ? 0 : rec.type === 'change' ? 1 : 2, Frequency: rec.type === 'terminate' ? "" : (rec.prescribedFrequency || "Weekly") }, FormElementId: 13013, FormElementType: 1006 },
          { Value: { DsmVersion: 5, NoteDiagnoses: diagnoses.map((d: any) => ({ Code: d.code || d.Code, Description: d.description || d.Description, Axis: null })), Explanation: "" }, FormElementId: 13009, FormElementType: 1003 },
          { Value: { OutcomeMeasureScoreConfiguration: { NoteId: 0, NoteRevision: 0, ClinicianId: 0, ScoreSelection: 1, AvailableOutcomeMeasures: [6,16,7,19,4,5,35,10,15,11,24,1,27,3,2,9,28,12,26,33,34,37,36,13,20,32,17,18,21,22,8,25,30,23,14,29,31,39,38,41,40,42,43,44,45], EpisodeOfCareStartDate: "1900-12-31T19:00:00", EpisodeOfCareEndDate: "2025-10-14T22:01:00", ShowResultsCategory: false, IsDefaultConfiguration: true, SelectedOutcomeMeasuresInOrder: null, OutcomeMeasuresWithPatientScore: [], LastSaved: null }, OutcomeMeasureScoreAggregates: [] }, FormElementId: 10002, FormElementType: 1009 },
          { Value: { ObjectivesProgress: [{ Id: 2439654, TreatmentObjectiveDescription: "Stay sober and maintain healthy relationships", ProgressDescription: "Progressing" }], NoTreatmentPlan: false }, FormElementId: 13008, FormElementType: 1002 },
          { Value: [{ IsNew: true, SignerHasLicenses: true, DateSigned: new Date().toISOString().replace(/\.\d{3}Z$/, ''), SignerId: userId, SignerSignatureLicenseInfo: { SignerDisplayName: "Lauren Goorno,LICSW, Therapist, License 110916,", SignerLicenseNumber: "110916", SignerTaxonomy: "Clinical Social Worker" }, SignatureType: 1 }], FormElementId: 10001, FormElementType: 53 }
        ]
      },
      PermissionsModifier: 1, IsBillable: false,
      NoteAiData: { IsAiEnabled: false, IsTrial: false, IsToneAdjustEnabled: false, NoteAiPromotionData: [{ FeatureType: 2, ArePromotionsOffered: false, ArePromotionUsesRemaining: false }, { FeatureType: 1, ArePromotionsOffered: true, ArePromotionUsesRemaining: true, PromotionId: 1 }], PsychologyProgressNoteAiData: { IsGenerationEnabled: false, WasGenerated: false, ElementsAllowed: [13000,13001,13002,13003], ElementsEnabled: [13000,13001,13002,13003], ElementsEdited: [], TreatmentApproach: "", SessionSummary: "<p></p>", UseTranscription: false, TranscribedAt: null, Feedback: 0, SessionSummaryFlattenedString: "" }, TranscriptionData: { IsAnyRecordingInProgress: false, IsAnyTranscriptionInProgress: false, TotalMinutes: 0, SumNotProcessedTranscriptMinutes: 0, LatestTranscriptionDate: null, TranscriptionQuality: 1, LessThanEightMinutes: true, TranscriptCanBeUsed: false } }
    }
    
    const response = await fetch('https://www.therapynotes.com/app/notes/api/savenote.aspx?msg=9', {
      method: 'POST', headers: { ...CONFIG.headers, 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest' },
      body: new URLSearchParams({ msg: '9', savenoterequest: JSON.stringify(payload), correlationid: crypto.randomUUID(), tnrac: CONFIG.rac }).toString()
    })
    
    const result = JSON.parse(await response.text())
    if (result.FormValidationResult && !result.FormValidationResult.IsValid) {
      throw new Error('Note validation failed: ' + JSON.stringify(result.FormValidationResult.Messages))
    }
    
    return new Response(JSON.stringify({ success: true }), { headers: { ...CONFIG.cors, 'Content-Type': 'application/json' } })
    
  } catch (error) {
    console.error('Progress note sync error:', error)
    return new Response(JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Sync failed' }), { status: 500, headers: { ...CONFIG.cors, 'Content-Type': 'application/json' } })
  }
})

async function loginToTherapyNotes(username: string, password: string, practiceCode: string) {
  const step1 = await fetch('https://www.therapynotes.com/app/session/processlogin.aspx?msg=3', {
    method: 'POST', headers: { ...CONFIG.headers, 'Referer': 'https://www.therapynotes.com/app/login/', 'Cookie': CONFIG.cookies },
    body: new URLSearchParams({ practicecode: practiceCode, docookiecheck: 'true', correlationid: crypto.randomUUID() }).toString(), redirect: 'manual'
  })
  
  const step1Cookies = Array.from(step1.headers.entries()).filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => v.split(';')[0])
  
  const step2 = await fetch('https://www.therapynotes.com/app/session/processlogin.aspx?msg=4', {
    method: 'POST', headers: { ...CONFIG.headers, 'Referer': 'https://www.therapynotes.com/app/login/', 'Cookie': `${CONFIG.cookies}; ${step1Cookies.join('; ')}` },
    body: new URLSearchParams({ msg: '4', password: await hashPassword(password), agreetos: 'false', docookiecheck: 'true', username, 'e-username': btoa(practiceCode), twofactorreentryskipfornow: 'false', correlationid: crypto.randomUUID() }).toString(), redirect: 'manual'
  })
  
  const cookies = Array.from(step2.headers.entries()).filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => v.split(';')[0])
  const accessToken = cookies.find(c => c.includes('access-token='))?.split('=')[1]
  const sessionId = cookies.find(c => c.includes('ASP.NET_SessionId='))?.split('=')[1]
  
  let userId = 0, practiceId = 0
  if (accessToken) {
    try {
      const payload = JSON.parse(atob(accessToken.split('.')[1]))
      const userClaims = payload.UserClaim || []
      for (const claim of userClaims) {
        if (claim.startsWith('UserId;')) userId = parseInt(claim.split(';')[1])
        if (claim.startsWith('PracticeId;')) practiceId = parseInt(claim.split(';')[1])
      }
    } catch (e) { console.error('Failed to decode access token:', e) }
  }
  
  return { accessToken, sessionId, userId, practiceId }
}

async function searchPatient(clientName: string, cookies: string) {
  const response = await fetch('https://www.therapynotes.com/app/common/searchforpatient.aspx?msg=20', {
    method: 'POST', headers: { ...CONFIG.headers, 'Referer': 'https://www.therapynotes.com/app/', 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest' },
    body: new URLSearchParams({ msg: '20', searchquery: clientName, practiceid: '-1', assigneduserid: '-1', param: JSON.stringify({ ExcludedPatients: [], AssignedPatientsOnlyIfNoSearchTerms: true }), correlationid: crypto.randomUUID(), tnrac: CONFIG.rac }).toString()
  })
  return (await response.json()).Matches?.[0] || null
}

async function hashPassword(password: string) {
  const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}