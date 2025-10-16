'use client'

import React from 'react'
import dynamic from 'next/dynamic'

const TimelineVisualization = dynamic(() => import('@/components/TimelineVisualization'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <span className="ml-2">時系列可視化コンポーネントを読み込み中...</span>
    </div>
  )
})

// Merkle DAG: participants.timeline.page
// 時系列統合可視化ページ
// 依存関係: TimelineVisualization component
// BPMN: TimelineVisualizationPage

interface TimelinePageProps {
  params: Promise<{ id: string }>
}

export default function TimelinePage({ params }: TimelinePageProps) {
  const [participantId, setParticipantId] = React.useState<string>('')

  React.useEffect(() => {
    params.then(({ id }) => {
      setParticipantId(id)
    })
  }, [params])

  if (!participantId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">読み込み中...</span>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-6">
        <h1 className="text-2xl font-bold text-blue-800 mb-2">時系列統合可視化</h1>
        <p className="text-blue-700 text-sm mb-4">
          session_data.jsonのtimestampを横軸として、単語表示イベントを基準点とした時系列統合可視化システムです。
          生理データ・burst・face・language・prosodyの反応値を加算・統合表示し、
          インタラクティブなUIで操作可能な反応パターン分析を提供します。
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-700">
          <div>
            <h3 className="font-semibold mb-2">データソース</h3>
            <div className="space-y-1">
              <div>• session_data.json (timestamp軸)</div>
              <div>• 感情データ (burst, face, language, prosody)</div>
              <div>• 生理データ (8チャンネル)</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">可視化機能</h3>
            <div className="space-y-1">
              <div>• 時系列チャート (D3.js)</div>
              <div>• リアルタイムフィルタリング</div>
              <div>• ズーム・パン機能</div>
              <div>• データポイント詳細表示</div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">分析機能</h3>
            <div className="space-y-1">
              <div>• 反応値統合計算</div>
              <div>• イベントタイプ別色分け</div>
              <div>• 統計情報表示</div>
              <div>• インタラクティブ操作</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">参加者ID: {participantId}</h2>
        <TimelineVisualization 
          participantId={participantId}
          width={1000}
          height={500}
        />
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">使用方法</h3>
        <div className="text-sm text-gray-700 space-y-2">
          <div><strong>マウスオーバー:</strong> データポイントの詳細情報を表示</div>
          <div><strong>クリック:</strong> データポイントを選択して詳細分析</div>
          <div><strong>ズーム:</strong> マウスホイールで拡大・縮小</div>
          <div><strong>パン:</strong> ドラッグでチャートを移動</div>
          <div><strong>フィルター:</strong> 上部のコントロールでデータを絞り込み</div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-semibold text-yellow-800 mb-2">注意事項</h3>
        <div className="text-sm text-yellow-700 space-y-1">
          <div>• 時系列データはsession_data.jsonのtimestampを基準としています</div>
          <div>• 感情データと生理データは時間範囲でマッチングされます</div>
          <div>• 反応値は感情データと生理データの合算値です</div>
          <div>• データの読み込みには時間がかかる場合があります</div>
        </div>
      </div>
    </div>
  )
}

// Merkle DAG: participants.timeline.page -> implementation_complete
// 時系列統合可視化ページの実装完了