import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TN_HEADERS = {
  'Content-Type': 'application/x-www-form-urlencoded',
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
  'Origin': 'https://www.therapynotes.com',
}

const BASE_COOKIES = 'timezone-offset=-240; cookie-detection=1'
const TN_RAC = 'BfcAAAAAAAD2ZJ40MeN_Gk1SkcfxW0mJoaa6g0Dn4n6NQfPwUKKXEw'

// Hardcoded values for single-therapist setup
const THERAPIST_ID = 63237
const PRACTICE_ID = 36416
const LOCATION_ID = 32291

// Helper function to wrap content in HTML paragraph tags
const toHtml = (text: string | undefined): string => text ? `<p>${text}</p>` : "<p></p>"

// Map recommendation type string to API enum
const getRecommendationType = (type: string | undefined): number => {
  const normalized = type?.toLowerCase()
  if (normalized === 'change' || normalized === 'change treatment goals or objectives') return 1
  if (normalized === 'terminate' || normalized === 'terminate treatment') return 2
  return 0 // Continue
}

// Build service codes array with add-on codes if applicable
const buildServiceCodes = (billingCodes: any[]): any[] => {
  const codes = [
    { Id: 4217196, Code: "90837", Units: 1, IsAddOn: false } // Main service code
  ]
  
  if (billingCodes?.some((bc: any) => bc.code === "90785")) {
    codes.push({ Id: 4105110, Code: "90785", Units: 1, IsAddOn: true })
  }
  
  if (billingCodes?.some((bc: any) => bc.code === "99050")) {
    codes.push({ Id: 4183917, Code: "99050", Units: 1, IsAddOn: true })
  }
  
  return codes
}

// Extract IP address from encrypted form metadata token
const decodeIpAddress = (token: string): string => {
  try {
    let base64 = token.replace(/-/g, '+').replace(/_/g, '/')
    while (base64.length % 4) base64 += '='
    const decoded = atob(base64)
    const jsonEnd = decoded.lastIndexOf('}}')
    if (jsonEnd === -1) throw new Error('Invalid token structure')
    const jsonString = decoded.substring(0, jsonEnd + 2)
    const parsed = JSON.parse(jsonString)
    return parsed.GetNoteRequest?.IpAddress
  } catch (e) {
    throw new Error('Failed to extract IP address from encrypted form metadata')
  }
}

function buildSaveNoteRequest(note: any, session: any, client: any, encryptedFormMetadata: string, treatmentObjectives: any[], ipAddress: string) {
  const content = note.content

  const formElementValues = [
    // Mental Status (13010) - DYNAMIC from progress note
    {
      Value: {
        Orientation: content.mentalStatus?.orientation || "X3: Oriented to Person, Place, and Time",
        Insights: content.mentalStatus?.insight || "Appropriate",
        GeneralAppearance: content.mentalStatus?.generalAppearance || "Appropriate",
        JudgmentImpulseControl: content.mentalStatus?.judgmentImpulse || "Appropriate",
        Dress: content.mentalStatus?.dress || "Appropriate",
        Memory: content.mentalStatus?.memory || "Intact",
        MotorActivity: content.mentalStatus?.motorActivity || "Normal",
        AttentionConcentration: content.mentalStatus?.attentionConcentration || "Appropriate",
        InterviewBehavior: content.mentalStatus?.interviewBehavior || "Appropriate",
        ThoughtProcess: content.mentalStatus?.thoughtProcess || "Normal",
        Speech: content.mentalStatus?.speech || "Normal",
        ThoughtContent: content.mentalStatus?.thoughtContent || "Appropriate",
        Mood: content.mentalStatus?.mood || "Euthymic",
        Perception: content.mentalStatus?.perception || "Normal",
        Affect: content.mentalStatus?.affect || "Appropriate",
        FunctionalStatus: content.mentalStatus?.functionalStatus || "Appropriate",
        CognitiveMentalStatus: content.mentalStatus?.cognitiveMentalStatus || "",
        InterpersonalMentalStatus: content.mentalStatus?.interpersonalMentalStatus || ""
      },
      FormElementId: 13010,
      FormElementType: 1005
    },
    // Risk Assessment (13011) - HARDCODED for testing (patient denies all risk)
    {
      Value: {
        ParticipantsType: 1,
        PatientDeniesAllAreasOfRisk: true,
        RiskAssessments: [{
          AreaOfRisk: "",
          LevelOfRisk: 0,
          IntentToAct: 0,
          PlanToAct: 0,
          MeansToAct: 0,
          RiskFactors: [],
          ProtectiveFactors: [],
          AdditionalDetails: "",
          NoSafetyIssues: null
        }]
      },
      FormElementId: 13011,
      FormElementType: 1004
    },
    // Medications (13014) - DYNAMIC from progress note
    { 
      Value: toHtml(content.medications), 
      FormElementId: 13014, 
      FormElementType: 26 
    },
    // Subjective (13000) - DYNAMIC from progress note
    { 
      Value: toHtml(content.subjectiveReport), 
      FormElementId: 13000, 
      FormElementType: 26 
    },
    // Objective (13001) - DYNAMIC from progress note
    { 
      Value: toHtml(content.objectiveContent), 
      FormElementId: 13001, 
      FormElementType: 26 
    },
    // Interventions (13005) - DYNAMIC from progress note
    { 
      Value: { 
        Interventions: content.interventions || [], 
        Other: "" 
      }, 
      FormElementId: 13005, 
      FormElementType: 1001 
    },
    // Assessment (13002) - DYNAMIC from progress note
    { 
      Value: toHtml(content.assessment), 
      FormElementId: 13002, 
      FormElementType: 26 
    },
    // Plan (13003) - DYNAMIC from progress note
    { 
      Value: toHtml(content.plan), 
      FormElementId: 13003, 
      FormElementType: 26 
    },
    // Recommendation (13013) - DYNAMIC from progress note
    { 
      Value: { 
        Recommendation: getRecommendationType(content.recommendation?.type),
        Frequency: content.recommendation?.prescribedFrequency || "Weekly" 
      }, 
      FormElementId: 13013, 
      FormElementType: 1006 
    },
    // Diagnosis (13009) - HARDCODED for testing
    {
      Value: {
        DsmVersion: 5,
        NoteDiagnoses: [
          { Code: "F10.20", Description: "Alcohol Use Disorder, Severe", Axis: null },
          { Code: "F32.0", Description: "Major Depressive Disorder, Single episode, Mild", Axis: null }
        ],
        Explanation: ""
      },
      FormElementId: 13009,
      FormElementType: 1003
    },
    // Outcome Measures (10002) - HARDCODED for testing
    {
      Value: {
        OutcomeMeasureScoreConfiguration: {
          NoteId: 0,
          NoteRevision: 0,
          ClinicianId: 0,
          ScoreSelection: 1,
          AvailableOutcomeMeasures: [6,16,7,19,4,5,35,10,15,11,24,1,27,3,2,9,28,12,26,33,34,37,36,13,20,32,17,18,21,22,8,25,30,23,14,29,31,39,38,41,40,42,43,44,45],
          EpisodeOfCareStartDate: "1900-12-31T19:00:00",
          EpisodeOfCareEndDate: "2025-10-28T04:01:00",
          ShowResultsCategory: false,
          IsDefaultConfiguration: true,
          SelectedOutcomeMeasuresInOrder: null,
          OutcomeMeasuresWithPatientScore: [],
          LastSaved: null
        },
        OutcomeMeasureScoreAggregates: []
      },
      FormElementId: 10002,
      FormElementType: 1009
    },
    // Treatment Progress (13008) - DYNAMIC from progress note
    {
      Value: {
        ObjectivesProgress: treatmentObjectives.map((obj: any) => ({
          Id: obj.Id,
          TreatmentObjectiveDescription: obj.TreatmentObjectiveDescription,
          ProgressDescription: content.treatmentProgress || "Progressing"
        })),
        NoTreatmentPlan: treatmentObjectives.length === 0
      },
      FormElementId: 13008,
      FormElementType: 1002
    },
    // Signature (10001) - HARDCODED for testing
    {
      Value: [{
        IsNew: true,
        SignerHasLicenses: true,
        DateSigned: new Date().toISOString().split('.')[0],
        SignerId: THERAPIST_ID,
        SignerSignatureLicenseInfo: {
          SignerDisplayName: "Lauren Goorno,LICSW, Therapist, License 110916,",
          SignerLicenseNumber: "110916",
          SignerTaxonomy: "Clinical Social Worker"
        },
        SignatureType: 1
      }],
      FormElementId: 10001,
      FormElementType: 53
    }
  ]

  const formMetadata = {
    GetNoteRequest: {
      NoteType: 4,
      UserId: THERAPIST_ID,
      PatientId: client.therapynotes_patient_id,
      CalendarEntryId: session.therapynotes_calendar_entry_id,
      NoteId: null,
      NoteRevision: null,
      IsEditing: true,
      NoteTemplate: null,
      CustomFormId: null,
      CustomFormVersionId: null,
      IpAddress: ipAddress,
      WasSaved: false,
      IsGroupNoteWorkflow: false
    },
    NoteVersion: 5,
    NoteTemplateId: 5,
    CustomFormId: null,
    CustomFormVersionId: null,
    OwnershipWillBeUpdatedOnSave: false,
    FormContext: 3,
    Locale: 1033,
    PracticeId: PRACTICE_ID,
    PatientId: client.therapynotes_patient_id,
    UserId: THERAPIST_ID,
    CalendarEntryClinicianId: THERAPIST_ID,
    FormTimeZoneInfo: {
      Abbreviation: "EDT",
      TimeZoneOffset: -300,
      ObservesDaylightSavings: true
    },
    CalendarEntryId: session.therapynotes_calendar_entry_id,
    PracticeSignatureContext: {
      PendingPracticeSignatureType: 1,
      CurrentUserCanSign: true,
      RequiresSupervisorSignature: false,
      SupervisorReviewStatus: 4,
      DefaultLicenseInfo: {
        SignerDisplayName: "Lauren Goorno,LICSW, Therapist, License #110916",
        SignerLicenseNumber: null,
        SignerTaxonomy: null
      }
    },
    DsmVersion: 0
  }

  return {
    FormData: {
      FormMetadata: formMetadata,
      EncryptedFormMetadata: encryptedFormMetadata,
      FormMacros: {},
      FormHeaderData: {
        Title: "Progress Note",
        DateAndTime: `${session.date}T${session.start_time}:00`,
        AppointmentDate: `${session.date}T${session.start_time}:00`,
        AuthorUserId: THERAPIST_ID,
        AuthorDisplayName: "Lauren Goorno,LICSW",
        ClinicianDisplayName: null,
        SupervisorId: null,
        SupervisorDisplayName: "",
        SupervisorRole: 0,
        SessionDuration: 60,
        LocationType: 1,
        LocationId: LOCATION_ID,
        ParticipantsType: 1,
        OtherParticipants: "",
        ServiceCodes: buildServiceCodes(content.billingCodes)
      },
      FormElementValues: formElementValues
    },
    PermissionsModifier: 1,
    IsBillable: false,
    NoteAiData: {
      IsAiEnabled: false,
      IsTrial: false,
      IsToneAdjustEnabled: false,
      NoteAiPromotionData: [
        { FeatureType: 2, ArePromotionsOffered: false, ArePromotionUsesRemaining: false, PromotionId: null },
        { FeatureType: 1, ArePromotionsOffered: true, ArePromotionUsesRemaining: true, PromotionId: 1 }
      ],
      PsychologyProgressNoteAiData: {
        IsGenerationEnabled: false,
        WasGenerated: false,
        ElementsAllowed: [13000, 13001, 13002, 13003],
        ElementsEnabled: [13000, 13001, 13002, 13003],
        ElementsEdited: [],
        TreatmentApproach: "",
        SessionSummary: "<p></p>",
        UseTranscription: false,
        TranscribedAt: null,
        Feedback: 0,
        SessionSummaryFlattenedString: ""
      },
      TranscriptionData: {
        IsAnyRecordingInProgress: false,
        IsAnyTranscriptionInProgress: false,
        TotalMinutes: 0,
        SumNotProcessedTranscriptMinutes: 0,
        LatestTranscriptionDate: null,
        TranscriptionQuality: 1,
        LessThanEightMinutes: true,
        TranscriptCanBeUsed: false
      }
    }
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  try {
    const { noteId, username, password, practiceCode } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get progress note with session and client data
    const { data: note } = await supabase
      .from('progress_notes')
      .select(`
        *,
        sessions:session_id (
          id,
          date,
          start_time,
          therapynotes_calendar_entry_id,
          therapynotes_encrypted_calendar_entry_id,
          client_id,
          clients:client_id (
            id,
            name,
            therapynotes_patient_id,
            therapynotes_encrypted_patient_id
          )
        )
      `)
      .eq('id', noteId)
      .single()

    if (!note) throw new Error('Progress note not found')
    if (!note.sessions) throw new Error('Session not found')
    if (!note.sessions.therapynotes_encrypted_calendar_entry_id) {
      throw new Error('Session must be synced to TherapyNotes first')
    }
    if (!note.sessions.clients) throw new Error('Client not found')
    if (!note.sessions.clients.therapynotes_encrypted_patient_id) {
      throw new Error('Client missing TherapyNotes patient ID')
    }

    // Login to TherapyNotes
    const { accessToken, sessionId } = await loginToTherapyNotes(username, password, practiceCode)
    if (!accessToken) throw new Error('Login failed')

    const cookies = `${BASE_COOKIES}; access-token=${accessToken}; ASP.NET_SessionId=${sessionId}`

    // Call getnote to get encrypted form metadata and treatment objectives
    const getNoteData = await getNote(
      note.sessions.therapynotes_encrypted_calendar_entry_id,
      note.sessions.clients.therapynotes_encrypted_patient_id,
      cookies
    )

    const encryptedFormMetadataFromAPI = getNoteData.Form?.Data?.EncryptedFormMetadata
    if (!encryptedFormMetadataFromAPI) {
      throw new Error('Failed to retrieve encrypted form metadata from TherapyNotes')
    }

    // Extract treatment objectives from API response
    const treatmentObjectives = getNoteData.Form?.Data?.FormElementValues?.find(
      (el: any) => el.FormElementId === 13008
    )?.Value?.ObjectivesProgress || []

    // Extract IP address from the encrypted metadata (required by TherapyNotes API)
    const ipAddressFromAPI = decodeIpAddress(encryptedFormMetadataFromAPI)
    if (!ipAddressFromAPI) {
      throw new Error('IP address is required but could not be extracted from form metadata')
    }

    // Build FormData structure with DYNAMIC values from API
    const formData = buildSaveNoteRequest(
      note,
      note.sessions,
      note.sessions.clients,
      encryptedFormMetadataFromAPI,
      treatmentObjectives,
      ipAddressFromAPI
    )

    // Call savenote to sync to TherapyNotes
    const saveResult = await saveNote(formData, cookies)

    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save note')
    }

    // Update database to mark as synced
    await supabase
      .from('progress_notes')
      .update({ synced_to_therapynotes: true })
      .eq('id', noteId)

    return new Response(
      JSON.stringify({ 
        success: true,
        noteId: saveResult.noteId,
        message: 'Progress note synced successfully'
      }),
      { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Progress note sync error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed',
        stack: error instanceof Error ? error.stack : undefined
      }),
      { status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})

async function loginToTherapyNotes(username: string, password: string, practiceCode: string) {
  const step1 = await fetch('https://www.therapynotes.com/app/session/processlogin.aspx?msg=3', {
    method: 'POST',
    headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/login/', 'Cookie': BASE_COOKIES },
    body: new URLSearchParams({
      practicecode: practiceCode,
      docookiecheck: 'true',
      correlationid: crypto.randomUUID()
    }).toString(),
    redirect: 'manual'
  })

  const step1Cookies = Array.from(step1.headers.entries())
    .filter(([k]) => k.toLowerCase() === 'set-cookie')
    .map(([, v]) => v.split(';')[0])

  const step2 = await fetch('https://www.therapynotes.com/app/session/processlogin.aspx?msg=4', {
    method: 'POST',
    headers: { ...TN_HEADERS, 'Referer': 'https://www.therapynotes.com/app/login/', 'Cookie': `${BASE_COOKIES}; ${step1Cookies.join('; ')}` },
    body: new URLSearchParams({
      msg: '4',
      password: await hashPassword(password),
      agreetos: 'false',
      docookiecheck: 'true',
      username,
      'e-username': btoa(practiceCode),
      twofactorreentryskipfornow: 'false',
      correlationid: crypto.randomUUID()
    }).toString(),
    redirect: 'manual'
  })

  const cookies = Array.from(step2.headers.entries())
    .filter(([k]) => k.toLowerCase() === 'set-cookie')
    .map(([, v]) => v.split(';')[0])
  
  const accessToken = cookies.find(c => c.includes('access-token='))?.split('=')[1]
  const sessionId = cookies.find(c => c.includes('ASP.NET_SessionId='))?.split('=')[1]

  return { accessToken, sessionId }
}

async function getNote(calendarEntryId: string, patientId: string, cookies: string) {
  const response = await fetch('https://www.therapynotes.com/app/notes/api/getnote.aspx?msg=3', {
    method: 'POST',
    headers: { 
      ...TN_HEADERS, 
      'Cookie': cookies, 
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.therapynotes.com/app/'
    },
    body: new URLSearchParams({
      msg: '3',
      notetype: '4',
      isediting: '1',
      encryptednotevalues: JSON.stringify({
        NoteId: null,
        NoteRevision: null,
        CalendarEntryId: calendarEntryId,
        PatientId: patientId,
        CustomFormId: null
      }),
      notetemplateid: 'null',
      customformid: 'null',
      customformversionid: 'null',
      wassaved: '0',
      isgroupnoteworkflow: '0',
      correlationid: crypto.randomUUID(),
      tnrac: TN_RAC
    }).toString()
  })

  return await response.json()
}

async function saveNote(formData: any, cookies: string) {
  const response = await fetch('https://www.therapynotes.com/app/notes/api/savenote.aspx?msg=9', {
    method: 'POST',
    headers: {
      ...TN_HEADERS,
      'Cookie': cookies,
      'X-Requested-With': 'XMLHttpRequest',
      'Referer': 'https://www.therapynotes.com/app/'
    },
    body: new URLSearchParams({
      msg: '9',
      savenoterequest: JSON.stringify(formData),
      correlationid: crypto.randomUUID(),
      tnrac: TN_RAC,
      tnv: '2025.8.8.96.230741'
    }).toString()
  })

  if (!response.ok) {
    throw new Error(`SaveNote failed with status ${response.status}`)
  }

  const responseText = await response.text()
  let result
  try {
    result = JSON.parse(responseText)
  } catch (e) {
    throw new Error(`Invalid JSON response: ${responseText.substring(0, 200)}`)
  }

  if (result.Result === 1 && result.FormValidationResult?.IsValid) {
    return {
      success: true,
      noteId: result.EncryptedNoteValues?.NoteId
    }
  }

  return {
    success: false,
    error: result.FormValidationResult?.Messages?.join(', ') || 'Save failed'
  }
}

async function hashPassword(password: string) {
  const data = new TextEncoder().encode(password)
  const hash = await crypto.subtle.digest('SHA-512', data)
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
}

