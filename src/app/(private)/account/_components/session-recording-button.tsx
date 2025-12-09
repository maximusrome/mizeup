'use client'

import { Button } from '@/components/ui/button'

export default function SessionRecordingButton() {
  return <Button onClick={() => window.open('/api/posthog-script.user.js', '_blank')}>Enable Cross-Site Recording</Button>
}


