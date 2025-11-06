import { NextResponse } from 'next/server'
import { getTherapistSettings } from '@/lib/db'

export async function GET() {
  try {
    const settings = await getTherapistSettings()
    
    if (!settings.reminder_api_key) {
      return NextResponse.json({ error: 'Reminders not enabled' }, { status: 400 })
    }
    
    // Generate shortcut JSON in iOS Shortcuts format
    const shortcutData = generateShortcutJSON(settings.reminder_api_key)
    
    // Return as downloadable file
    return new NextResponse(JSON.stringify(shortcutData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="MizeUp-Reminders.shortcut"'
      }
    })
  } catch {
    return NextResponse.json(
      { error: 'Failed to generate shortcut' },
      { status: 500 }
    )
  }
}

function generateShortcutJSON(apiKey: string) {
  const apiUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://mizeup.com'
  
  // iOS Shortcuts format
  // This is a simplified structure - actual iOS Shortcuts files are more complex
  // For production, consider using a proper shortcuts generation library
  return {
    WFWorkflowActions: [
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.url',
        WFWorkflowActionParameters: {
          WFURLActionURL: `${apiUrl}/api/reminders/tomorrow?key=${apiKey}`
        }
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.downloadurl',
        WFWorkflowActionParameters: {
          WFHTTPMethod: 'GET'
        }
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.getvalueforkey',
        WFWorkflowActionParameters: {
          WFDictionaryKey: 'reminders'
        }
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.repeat.each',
        WFWorkflowActionParameters: {
          WFInput: 'Repeat Results'
        }
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.getvalueforkey',
        WFWorkflowActionParameters: {
          WFDictionaryKey: 'phoneNumber'
        }
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.setvariable',
        WFWorkflowActionParameters: {
          WFVariableName: 'Phone'
        }
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.getvalueforkey',
        WFWorkflowActionParameters: {
          WFInput: 'Repeat Item',
          WFDictionaryKey: 'message'
        }
      },
      {
        WFWorkflowActionIdentifier: 'is.workflow.actions.sendmessage',
        WFWorkflowActionParameters: {
          WFSendMessageActionRecipients: ['Phone'],
          WFSendMessageContent: 'Action Output'
        }
      }
    ],
    WFWorkflowClientVersion: '2302.0.4',
    WFWorkflowClientRelease: '2.14.3',
    WFWorkflowMinimumClientVersionString: '900',
    WFWorkflowMinimumClientVersion: 900,
    WFWorkflowIcon: {
      WFWorkflowIconStartColor: 4282601983,
      WFWorkflowIconGlyphNumber: 59511
    },
    WFWorkflowTypes: ['NCWidget', 'Watch'],
    WFWorkflowInputContentItemClasses: [
      'WFAppStoreAppContentItem',
      'WFArticleContentItem',
      'WFContactContentItem',
      'WFDateContentItem',
      'WFEmailAddressContentItem',
      'WFGenericFileContentItem',
      'WFImageContentItem',
      'WFiTunesProductContentItem',
      'WFLocationContentItem',
      'WFDCMapsLinkContentItem',
      'WFAVAssetContentItem',
      'WFPDFContentItem',
      'WFPhoneNumberContentItem',
      'WFRichTextContentItem',
      'WFSafariWebPageContentItem',
      'WFStringContentItem',
      'WFURLContentItem'
    ],
    WFWorkflowImportQuestions: [],
    WFWorkflowNoInputBehavior: {
      Name: 'WFWorkflowNoInputBehaviorAskForInput',
      Parameters: {
        ItemClass: 'WFStringContentItem'
      }
    },
    WFWorkflowHasShortcutInputVariables: false
  }
}

