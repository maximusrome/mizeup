import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CONFIG = {
  cors: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' },
  headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36', 'Origin': 'https://www.therapynotes.com' },
  cookies: 'timezone-offset=-240; cookie-detection=1',
  rac: 'BfcAAAAAAAD2ZJ40MeN_Gk1SkcfxW0mJoaa6g0Dn4n6NQfPwUKKXEw',
  version: '2025.8.7.74.275312'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CONFIG.cors })
  
  try {
    const { username, password, practiceCode, calendarEntryId, encryptedCalendarEntryId, encryptedPatientId, sessionDate, sessionStartTime } = await req.json()
    
    if (!calendarEntryId || !encryptedCalendarEntryId || !encryptedPatientId || !sessionDate || !sessionStartTime) {
      throw new Error('Missing required parameters')
    }
    
    // Login ONCE for all operations
    const { accessToken, sessionId } = await loginToTherapyNotes(username, password, practiceCode)
    if (!accessToken) throw new Error('Login failed')
    
    const cookies = `${CONFIG.cookies}; access-token=${accessToken}; ASP.NET_SessionId=${sessionId}`
    
    // Hardcoded IDs from Lauren's TherapyNotes account
    // TODO: Make these dynamic by storing in database during session/client sync
    const THERAPIST_DATA = {
      userId: 63237,
      practiceId: 36416,
      patientId: 2190697,
      locationId: 32291,
      serviceCodeId: 4217196,
      treatmentObjectiveId: 2439654,
      displayName: "Lauren Goorno,LICSW",
      licenseInfo: {
        SignerDisplayName: "Lauren Goorno,LICSW, Therapist, License 110916,",
        SignerLicenseNumber: "110916",
        SignerTaxonomy: "Clinical Social Worker"
      }
    }
    
    // Shared fetch headers for all TherapyNotes API calls
    const apiHeaders = { ...CONFIG.headers, 'Cookie': cookies, 'X-Requested-With': 'XMLHttpRequest', 'Referer': 'https://www.therapynotes.com/app/' }
    
    // Shared NoteAiData (used in both snapshot and final save)
    const noteAiData = {
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
    
    // Shared form header data (used in both snapshot and final save)
    const formHeaderData = {
      Title: "Progress Note",
      DateAndTime: `${sessionDate}T${sessionStartTime}`,
      AppointmentDate: `${sessionDate}T${sessionStartTime}`,
      AuthorUserId: THERAPIST_DATA.userId,
      AuthorDisplayName: THERAPIST_DATA.displayName,
      ClinicianDisplayName: null,
      SupervisorId: null,
      SupervisorDisplayName: "",
      SupervisorRole: 0,
      SessionDuration: 60,
      LocationType: 1,
      LocationId: THERAPIST_DATA.locationId,
      ParticipantsType: 1,
      OtherParticipants: "",
      ServiceCodes: [{ Id: THERAPIST_DATA.serviceCodeId, Code: "90837", Units: 1, IsAddOn: false }]
    }
    
    // ===== STEP 1: Create autosave snapshot (draft note) =====
    const encryptedNoteValues = {
      NoteId: null,
      NoteRevision: null,
      PatientId: encryptedPatientId,
      CalendarEntryId: encryptedCalendarEntryId,
      CustomFormId: null
    }
    
    const noteAutosaveSnapshot = {
      NoteInfo: {
        NoteId: 0,
        NoteRevision: 0,
        IsSigned: false,
        IsNewNote: true,
        IsNewRevision: false,
        PermissionsModifier: 1,
        IsMostRecentRevision: true,
        IsSignatureRequired: true,
        DateCreated: new Date().toISOString(),
        NoteApprovalContext: {
          IsPendingSupervisorApproval: true,
          CurrentUserIsSupervisor: false,
          SupervisorRole: 0,
          SupervisorReviewStatus: 0,
          SupervisorDisplayName: "",
          SupervisorReviewDate: null,
          SupervisorComments: null,
          PreviousRevisionRejected: false,
          PreviousReviewDate: null,
          PreviousReviewComments: null,
          PreviousRevisionSupervisorDisplayName: null
        },
        PatientSharingSettings: { CanShare: false, RequiresPatientSignature: false },
        DocumentAccessType: 1,
        IsNoteVisibilityEditable: false,
        IsDocument: false,
        CurrentCustomNoteVersionId: null,
        NoteBillingInfo: {
          CanBeSetAsBillable: false,
          BillableCheckboxLabel: null,
          IsBillable: false,
          BillableItemId: null,
          BillableItemType: null,
          IsBillableItemPaid: false
        },
        NoteRequirement: 3,
        SharingRequirement: 0,
        NoteStatus: 1
      },
      FormHeaderData: formHeaderData,
      FormElementValues: [
        { Value: { Orientation: "", Insights: "", GeneralAppearance: "", JudgmentImpulseControl: "", Dress: "", Memory: "", MotorActivity: "", AttentionConcentration: "", InterviewBehavior: "", ThoughtProcess: "", Speech: "", ThoughtContent: "", Mood: "", Perception: "", Affect: "", FunctionalStatus: "", CognitiveMentalStatus: "", InterpersonalMentalStatus: "" }, FormElementId: 13010, FormElementType: 1005 },
        { Value: { ParticipantsType: 1, PatientDeniesAllAreasOfRisk: false, RiskAssessments: [{ AreaOfRisk: "", LevelOfRisk: 0, IntentToAct: 0, PlanToAct: 0, MeansToAct: 0, RiskFactors: [], ProtectiveFactors: [], AdditionalDetails: "", NoSafetyIssues: null }] }, FormElementId: 13011, FormElementType: 1004 },
        { Value: "", FormElementId: 13014, FormElementType: 26 },
        { Value: "", FormElementId: 13000, FormElementType: 26 },
        { Value: "", FormElementId: 13001, FormElementType: 26 },
        { Value: { Interventions: [], Other: "" }, FormElementId: 13005, FormElementType: 1001 },
        { Value: "", FormElementId: 13002, FormElementType: 26 },
        { Value: "", FormElementId: 13003, FormElementType: 26 },
        { Value: { Recommendation: 0, Frequency: "Weekly" }, FormElementId: 13013, FormElementType: 1006 },
        { Value: { DsmVersion: 5, NoteDiagnoses: [{ Code: "F10.20", Description: "Alcohol Use Disorder, Severe", Axis: null }, { Code: "F32.0", Description: "Major Depressive Disorder, Single episode, Mild", Axis: null }], Explanation: "" }, FormElementId: 13009, FormElementType: 1003 },
        { Value: { OutcomeMeasureScoreConfiguration: { NoteId: 0, NoteRevision: 0, ClinicianId: 0, ScoreSelection: 1, AvailableOutcomeMeasures: [6, 16, 7, 19, 4, 5, 35, 10, 15, 11, 24, 1, 27, 3, 2, 9, 28, 12, 26, 33, 34, 37, 36, 13, 20, 32, 17, 18, 21, 22, 8, 25, 30, 23, 14, 29, 31, 39, 38, 41, 40, 42, 43, 44, 45], EpisodeOfCareStartDate: "1900-12-31T19:00:00", EpisodeOfCareEndDate: `${sessionDate}T04:01:00`, ShowResultsCategory: false, IsDefaultConfiguration: true, SelectedOutcomeMeasuresInOrder: null, OutcomeMeasuresWithPatientScore: [], LastSaved: null }, OutcomeMeasureScoreAggregates: [] }, FormElementId: 10002, FormElementType: 1009 },
        { Value: { ObjectivesProgress: [{ Id: THERAPIST_DATA.treatmentObjectiveId, TreatmentObjectiveDescription: "Stay sober and maintain healthy relationships", ProgressDescription: "" }], NoTreatmentPlan: false }, FormElementId: 13008, FormElementType: 1002 },
        { Value: [{ IsNew: true, SignerHasLicenses: true, DateSigned: null, SignerId: THERAPIST_DATA.userId, SignerSignatureLicenseInfo: THERAPIST_DATA.licenseInfo, SignatureType: 1 }], FormElementId: 10001, FormElementType: 53 }
      ],
      NoteAiData: noteAiData
    }
    
    const snapshotResponse = await fetch('https://www.therapynotes.com/app/notes/api/savenoteautosavesnapshot.aspx?msg=7', {
      method: 'POST',
      headers: apiHeaders,
      body: new URLSearchParams({
        msg: '7',
        notetype: '4',
        notetemplateid: '5',
        customformid: 'null',
        encryptednotevalues: JSON.stringify(encryptedNoteValues),
        noteautosavesnapshot: JSON.stringify(noteAutosaveSnapshot),
        correlationid: crypto.randomUUID(),
        tnrac: CONFIG.rac,
        tnv: CONFIG.version
      })
    })
    
    const snapshotResult = await snapshotResponse.json()
    if (snapshotResult.Result !== 1) {
      throw new Error('Autosave snapshot failed: ' + JSON.stringify(snapshotResult))
    }
    
    // ===== STEP 2: Get note to retrieve encrypted metadata =====
    const getNoteResponse = await fetch('https://www.therapynotes.com/app/notes/api/getnote.aspx?msg=3', {
      method: 'POST',
      headers: apiHeaders,
      body: new URLSearchParams({
        msg: '3',
        notetype: '4',
        isediting: '1',
        encryptednotevalues: JSON.stringify(encryptedNoteValues),
        notetemplateid: 'null',
        customformid: 'null',
        customformversionid: 'null',
        wassaved: '0',
        isgroupnoteworkflow: '0',
        correlationid: crypto.randomUUID(),
        tnrac: CONFIG.rac,
        tnv: CONFIG.version
      })
    })
    
    const getNoteResult = await getNoteResponse.json()
    if (getNoteResult.Result !== 1) {
      throw new Error('GetNote API failed: ' + JSON.stringify(getNoteResult.ValidationMessages || getNoteResult))
    }
    
    const encryptedFormMetadata = getNoteResult.Form?.Data?.EncryptedFormMetadata
    if (!encryptedFormMetadata) {
      throw new Error('EncryptedFormMetadata not found in response')
    }
    
    // ===== STEP 3: Extract IP from fetched metadata =====
    let ipAddress = "66.30.227.195" // Fallback
    try {
      const base64 = encryptedFormMetadata.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - encryptedFormMetadata.length % 4) % 4)
      const decoded = new TextDecoder().decode(Uint8Array.from(atob(base64), c => c.charCodeAt(0)))
      const json = decoded.substring(0, decoded.lastIndexOf('}') + 1)
      ipAddress = JSON.parse(json).GetNoteRequest?.IpAddress || ipAddress
    } catch (e) {
      console.error('Could not extract IP from metadata, using fallback')
    }
    
    // ===== STEP 4: Save final progress note with metadata =====
    const payload = {
      FormData: {
        FormMetadata: {
          GetNoteRequest: {
            NoteType: 4,
            UserId: THERAPIST_DATA.userId,
            PatientId: THERAPIST_DATA.patientId,
            CalendarEntryId: calendarEntryId,
            NoteId: null,
            NoteRevision: null,
            IsEditing: true,
            NoteTemplate: null,
            CustomFormId: null,
            CustomFormVersionId: null,
            IpAddress: ipAddress,  // Must match encrypted metadata signature
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
          PracticeId: THERAPIST_DATA.practiceId,
          PatientId: THERAPIST_DATA.patientId,
          UserId: THERAPIST_DATA.userId,
          CalendarEntryClinicianId: THERAPIST_DATA.userId,
          FormTimeZoneInfo: {
            Abbreviation: "EDT",
            TimeZoneOffset: -300,
            ObservesDaylightSavings: true
          },
          CalendarEntryId: calendarEntryId,
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
        },
        EncryptedFormMetadata: encryptedFormMetadata,
        FormMacros: {},
        FormHeaderData: formHeaderData,
        FormElementValues: [
          {
            Value: {
              Orientation: "X3: Oriented to Person, Place, and Time",
              Insights: "Excellent",
              GeneralAppearance: "Appropriate",
              JudgmentImpulseControl: "Excellent",
              Dress: "Appropriate",
              Memory: "Intact",
              MotorActivity: "Unremarkable",
              AttentionConcentration: "Good",
              InterviewBehavior: "Appropriate",
              ThoughtProcess: "Unremarkable",
              Speech: "Normal",
              ThoughtContent: "Appropriate",
              Mood: "Euthymic",
              Perception: "Unremarkable",
              Affect: "Congruent",
              FunctionalStatus: "Intact",
              CognitiveMentalStatus: "",
              InterpersonalMentalStatus: ""
            },
            FormElementId: 13010,
            FormElementType: 1005
          },
          {
            Value: {
              ParticipantsType: 1,
              PatientDeniesAllAreasOfRisk: true,
              RiskAssessments: [
                {
                  AreaOfRisk: "",
                  LevelOfRisk: 0,
                  IntentToAct: 0,
                  PlanToAct: 0,
                  MeansToAct: 0,
                  RiskFactors: [],
                  ProtectiveFactors: [],
                  AdditionalDetails: "",
                  NoSafetyIssues: null
                }
              ]
            },
            FormElementId: 13011,
            FormElementType: 1004
          },
          { Value: "<p>m</p>", FormElementId: 13014, FormElementType: 26 },
          { Value: "<p>s</p>", FormElementId: 13000, FormElementType: 26 },
          { Value: "<p>o</p>", FormElementId: 13001, FormElementType: 26 },
          {
            Value: { Interventions: ["Cognitive Challenging"], Other: "" },
            FormElementId: 13005,
            FormElementType: 1001
          },
          { Value: "<p>a</p>", FormElementId: 13002, FormElementType: 26 },
          { Value: "<p>p</p>", FormElementId: 13003, FormElementType: 26 },
          {
            Value: { Recommendation: 0, Frequency: "Weekly" },
            FormElementId: 13013,
            FormElementType: 1006
          },
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
          {
            Value: {
              OutcomeMeasureScoreConfiguration: {
                NoteId: 0,
                NoteRevision: 0,
                ClinicianId: 0,
                ScoreSelection: 1,
                  AvailableOutcomeMeasures: [6, 16, 7, 19, 4, 5, 35, 10, 15, 11, 24, 1, 27, 3, 2, 9, 28, 12, 26, 33, 34, 37, 36, 13, 20, 32, 17, 18, 21, 22, 8, 25, 30, 23, 14, 29, 31, 39, 38, 41, 40, 42, 43, 44, 45],
                  EpisodeOfCareStartDate: "1900-12-31T19:00:00",
                  EpisodeOfCareEndDate: `${sessionDate}T04:01:00`,
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
          {
            Value: {
              ObjectivesProgress: [
                {
                  Id: THERAPIST_DATA.treatmentObjectiveId,
                  TreatmentObjectiveDescription: "Stay sober and maintain healthy relationships",
                  ProgressDescription: "Progressing"
                }
              ],
              NoTreatmentPlan: false
            },
            FormElementId: 13008,
            FormElementType: 1002
          },
          {
            Value: [
              {
                IsNew: true,
                SignatureType: 1,
                DateSigned: new Date().toISOString().split('.')[0],
                IsSigned: false,
                SignerHasLicenses: true,
                SignerId: THERAPIST_DATA.userId,
                SignerSignatureLicenseInfo: THERAPIST_DATA.licenseInfo
              }
            ],
            FormElementId: 10001,
            FormElementType: 53
          }
        ]
      },
      PermissionsModifier: 1,
      IsBillable: false,
      NoteAiData: noteAiData
    }
    
    const response = await fetch('https://www.therapynotes.com/app/notes/api/savenote.aspx?msg=10', {
      method: 'POST',
      headers: apiHeaders,
      body: new URLSearchParams({
        msg: '10',
        savenoterequest: JSON.stringify(payload),
        correlationid: crypto.randomUUID(),
        tnrac: CONFIG.rac,
        tnv: CONFIG.version
      })
    })
    
    const responseText = await response.text()
    
    // Check if response is HTML (error page)
    if (responseText.trim().startsWith('<!DOCTYPE') || responseText.trim().startsWith('<html')) {
      throw new Error(`TherapyNotes returned error page (Status: ${response.status})`)
    }
    
    const result = JSON.parse(responseText)
    
    // Check for API success
    if (result.Result !== 1) {
      throw new Error(`TherapyNotes API error: ${JSON.stringify(result)}`)
    }
    
    // Check for form validation errors
    if (result.FormValidationResult && !result.FormValidationResult.IsValid) {
      throw new Error('Note validation failed: ' + JSON.stringify(result.FormValidationResult.Messages))
    }
    
    return new Response(JSON.stringify({ success: true, result }), { headers: { ...CONFIG.cors, 'Content-Type': 'application/json' } })
    
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
  
  return { accessToken, sessionId }
}

async function hashPassword(password: string) {
  const hash = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(password))
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase()
}