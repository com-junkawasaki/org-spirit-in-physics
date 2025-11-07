/**
 * Merkle DAG: components.timeline_visualization_wrapper
 * Client component wrapper for TimelineVisualization
 * RDF: https://spirit-in-physics.gftd.ai/component/timeline_visualization_wrapper
 * 
 * This wrapper is necessary because TimelineVisualization is a client component
 * and cannot be directly used in a server component (ParticipantDetailContent).
 */

'use client'

import dynamic from 'next/dynamic'

// Dynamically import TimelineVisualization to avoid SSR issues
const TimelineVisualization = dynamic(
  () => import('@/components/TimelineVisualization'),
  { 
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">時系列データを読み込み中...</span>
      </div>
    ),
  }
)

interface TimelineVisualizationWrapperProps {
  participantId: string
}

export default function TimelineVisualizationWrapper({ participantId }: TimelineVisualizationWrapperProps) {
  return (
    <div className="w-full">
      <TimelineVisualization 
        participantId={participantId}
        width={800}
        height={400}
        hideFilters={false}
      />
    </div>
  )
}

