'use client'

// Merkle DAG: app.3d_force_timeline.page
// OWL: spirit:ForceTimelinePage
// GraphQL化: REST APIからGraphQLクエリに移行

import { useEffect, useId, useState } from 'react'
import { DashboardLayout } from '@/components/layout/PageLayout'
import TimelineVisualization from '@/components/TimelineVisualization'
import { useParticipants } from '@/lib/graphql/hooks'

export default function ForceTimelinePage() {
  const [participantId, setParticipantId] = useState<string>('144b325f-5966-4d59-a629-f2ca421388cc')
  const inputId = useId()

  // GraphQLクエリを使用してparticipantsを取得
  const { data, loading, error } = useParticipants({
    fetchPolicy: 'network-only', // 常に最新データを取得
  })

  // GraphQLレスポンスからoptionsを生成
  const options = (data?.participants || []).map((p) => ({
    id: p.id,
    label: `参加者 ${p.id.slice(0, 8)}`,
  }))

  // デフォルトparticipantIdが未設定かつoptionsがある場合、先頭を選択
  useEffect(() => {
    if (!participantId && options.length > 0) {
      setParticipantId(options[0].id)
    }
  }, [participantId, options.length])

  // エラー表示
  if (error) {
    return (
      <DashboardLayout
        header={{
          title: '3D Force Timeline',
          description: '感情類似度をフォースに統合した時系列×3D可視化の専用ページ',
          backHref: '/spirits',
          backLabel: '参加者一覧へ'
        }}
      >
        <div className="text-center text-red-600 p-4">
          <p>エラー: {error.message || '参加者データの取得に失敗しました'}</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout
      header={{
        title: '3D Force Timeline',
        description: '感情類似度をフォースに統合した時系列×3D可視化の専用ページ',
        backHref: '/participants',
        backLabel: '参加者一覧へ'
      }}
    >
      <div className="mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm" htmlFor={inputId}>Participant</label>
          <select
            id={inputId}
            value={participantId}
            onChange={(e) => setParticipantId(e.target.value)}
            className="border rounded px-2 py-1 min-w-[320px]"
            disabled={loading}
          >
            {loading && options.length === 0 && (
              <option value="">読み込み中...</option>
            )}
            {options.map((o) => (
              <option key={o.id} value={o.id}>{o.label} — {o.id}</option>
            ))}
            {!loading && options.length === 0 && (
              <option value={participantId}>{participantId}</option>
            )}
          </select>
        </div>
        
      </div>

      <TimelineVisualization
        participantId={participantId}
        width={1000}
        height={560}
        hideFilters
      />
    </DashboardLayout>
  )
}


