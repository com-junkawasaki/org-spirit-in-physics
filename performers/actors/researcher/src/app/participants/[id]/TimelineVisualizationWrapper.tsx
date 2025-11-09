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
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-6 w-6 bg-blue-600 rounded-full animate-pulse"></div>
          </div>
        </div>
        <div className="text-center space-y-2">
          <p className="text-lg font-medium text-gray-700">時系列データを読み込み中...</p>
          <p className="text-sm text-gray-500">初期表示用にサンプリング済みデータ（2000ポイント）を読み込んでいます</p>
          <div className="flex items-center justify-center space-x-1 mt-4">
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="h-2 w-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
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

