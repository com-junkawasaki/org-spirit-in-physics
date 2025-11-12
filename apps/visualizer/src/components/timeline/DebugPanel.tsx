// Merkle DAG: components.timeline_debug_panel
// デバッグパネルコンポーネント
// データ取得と処理パイプラインの状態を可視化

'use client'

import React from 'react'

export interface PipelineStep {
  id: string
  name: string
  status: 'pending' | 'processing' | 'success' | 'error' | 'warning'
  message?: string
  data?: any
  duration?: number
}

export interface DataSourceStatus {
  name: string
  status: 'loading' | 'success' | 'error' | 'empty'
  count?: number
  error?: string
  sample?: any
}

export interface DebugPanelProps {
  dataSources: DataSourceStatus[]
  pipelineSteps: PipelineStep[]
  connectionStats?: {
    totalWords: number
    connectedWords: number
    totalConnections: number
    averageConnectionsPerWord: number
    disconnectedWords: string[]
    zeroEmotionWords: string[]
  }
  emotionVectorStats?: {
    totalWords: number
    wordsWithEmotion: number
    wordsWithZeroEmotion: number
    averageEmotionMagnitude: number
    emotionDistribution: Record<string, number>
  }
  onClose?: () => void
}

export default function DebugPanel({
  dataSources,
  pipelineSteps,
  connectionStats,
  emotionVectorStats,
  onClose
}: DebugPanelProps) {
  const getStatusColor = (status: PipelineStep['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'warning': return 'text-yellow-600 bg-yellow-50'
      case 'processing': return 'text-blue-600 bg-blue-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getDataSourceStatusColor = (status: DataSourceStatus['status']) => {
    switch (status) {
      case 'success': return 'text-green-600 bg-green-50'
      case 'error': return 'text-red-600 bg-red-50'
      case 'loading': return 'text-blue-600 bg-blue-50'
      case 'empty': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <div className="border rounded-lg bg-white shadow-lg max-h-[80vh] overflow-y-auto">
      <div className="sticky top-0 bg-white border-b p-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">デバッグパネル</h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-sm"
          >
            ✕
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* データソース状態 */}
        <div>
          <h4 className="font-medium text-sm mb-2">データソース状態</h4>
          <div className="space-y-2">
            {dataSources.map((source, idx) => (
              <div
                key={idx}
                className={`p-2 rounded text-xs ${getDataSourceStatusColor(source.status)}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{source.name}</span>
                  <span className="text-xs">
                    {source.status === 'loading' && '読み込み中...'}
                    {source.status === 'success' && `✓ ${source.count ?? 0}件`}
                    {source.status === 'error' && '✗ エラー'}
                    {source.status === 'empty' && '⚠ データなし'}
                  </span>
                </div>
                {source.error && (
                  <div className="mt-1 text-xs text-red-600">{source.error}</div>
                )}
                {source.sample && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-xs">サンプルデータ</summary>
                    <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(source.sample, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 処理パイプライン */}
        <div>
          <h4 className="font-medium text-sm mb-2">処理パイプライン</h4>
          <div className="space-y-2">
            {pipelineSteps.map((step, idx) => (
              <div key={step.id} className="relative">
                {idx > 0 && (
                  <div className="absolute left-3 top-0 w-0.5 h-2 bg-gray-300 -translate-y-full" />
                )}
                <div className={`p-2 rounded text-xs ${getStatusColor(step.status)}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-current" />
                      <span className="font-medium">{step.name}</span>
                    </div>
                    {step.duration && (
                      <span className="text-xs opacity-70">{step.duration}ms</span>
                    )}
                  </div>
                  {step.message && (
                    <div className="mt-1 text-xs opacity-80">{step.message}</div>
                  )}
                  {step.data && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-xs">詳細データ</summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto max-h-32">
                        {typeof step.data === 'string' ? step.data : JSON.stringify(step.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 感情ベクトル統計 */}
        {emotionVectorStats && (
          <div>
            <h4 className="font-medium text-sm mb-2">感情ベクトル統計</h4>
            <div className="p-3 bg-gray-50 rounded text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-600">総単語数:</span>
                  <span className="ml-2 font-medium">{emotionVectorStats.totalWords}</span>
                </div>
                <div>
                  <span className="text-gray-600">感情データあり:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {emotionVectorStats.wordsWithEmotion}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">感情データなし:</span>
                  <span className="ml-2 font-medium text-red-600">
                    {emotionVectorStats.wordsWithZeroEmotion}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">平均感情マグニチュード:</span>
                  <span className="ml-2 font-medium">
                    {emotionVectorStats.averageEmotionMagnitude.toFixed(3)}
                  </span>
                </div>
              </div>
              {emotionVectorStats.wordsWithZeroEmotion > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="font-medium text-yellow-800 mb-1">
                    感情データなしの単語 ({emotionVectorStats.wordsWithZeroEmotion}件):
                  </div>
                  <div className="text-xs text-yellow-700 max-h-24 overflow-y-auto">
                    {Object.entries(emotionVectorStats.emotionDistribution)
                      .filter(([_, count]) => count === 0)
                      .map(([word]) => word)
                      .slice(0, 20)
                      .join(', ')}
                    {emotionVectorStats.wordsWithZeroEmotion > 20 && ' ...'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 接続統計 */}
        {connectionStats && (
          <div>
            <h4 className="font-medium text-sm mb-2">接続統計</h4>
            <div className="p-3 bg-gray-50 rounded text-xs space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-600">総単語数:</span>
                  <span className="ml-2 font-medium">{connectionStats.totalWords}</span>
                </div>
                <div>
                  <span className="text-gray-600">接続済み単語:</span>
                  <span className="ml-2 font-medium text-green-600">
                    {connectionStats.connectedWords}
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">総接続数:</span>
                  <span className="ml-2 font-medium">{connectionStats.totalConnections}</span>
                </div>
                <div>
                  <span className="text-gray-600">平均接続数/単語:</span>
                  <span className="ml-2 font-medium">
                    {connectionStats.averageConnectionsPerWord.toFixed(2)}
                  </span>
                </div>
              </div>
              {connectionStats.disconnectedWords.length > 0 && (
                <div className="mt-2 p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="font-medium text-yellow-800 mb-1">
                    接続なしの単語 ({connectionStats.disconnectedWords.length}件):
                  </div>
                  <div className="text-xs text-yellow-700 max-h-24 overflow-y-auto">
                    {connectionStats.disconnectedWords.slice(0, 20).join(', ')}
                    {connectionStats.disconnectedWords.length > 20 && ' ...'}
                  </div>
                </div>
              )}
              {connectionStats.zeroEmotionWords.length > 0 && (
                <div className="mt-2 p-2 bg-red-50 rounded border border-red-200">
                  <div className="font-medium text-red-800 mb-1">
                    感情ベクトルが0の単語 ({connectionStats.zeroEmotionWords.length}件):
                  </div>
                  <div className="text-xs text-red-700 max-h-24 overflow-y-auto">
                    {connectionStats.zeroEmotionWords.slice(0, 20).join(', ')}
                    {connectionStats.zeroEmotionWords.length > 20 && ' ...'}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

