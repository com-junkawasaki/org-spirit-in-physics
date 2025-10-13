'use client'

import { useParams } from 'next/navigation'

export default function ParticipantTimelinePage() {
  const params = useParams()
  const participantId = params.id as string

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Timeline Analysis</h1>
      <p>Participant ID: {participantId}</p>
      <p>This participant has no timeline data yet.</p>
    </div>
  )
}
