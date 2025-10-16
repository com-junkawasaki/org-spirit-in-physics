'use client'

import React, { useState } from 'react'

const DEFAULT_PARTICIPANT_ID = '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413'

export default function AnalysisPipelinePage() {
  const [participantId, setParticipantId] = useState(DEFAULT_PARTICIPANT_ID)
  const [running, setRunning] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)

  async function runAnalysisPipeline() {
    setRunning(true)
    setLogLines([])
    setResult(null)
    
    try {
      setLogLines(l => [...l, '解析パイプライン開始...'])
      
      const response = await fetch('/api/analysis/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          participantId,
          options: {
            enableWord2Vec: true,
            enableEmotionAnalysis: true,
            enablePhysiologicalAnalysis: true
          }
        })
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        setLogLines(l => [...l, `解析完了: Spirit確率 ${data.results.summary?.spiritProbability?.toFixed(3) || 'N/A'}`])
        
        // 各ステップの結果をログに追加
        if (data.results.steps) {
          Object.entries(data.results.steps).forEach(([stepName, stepResult]: [string, any]) => {
            setLogLines(l => [...l, `${stepName}: ${stepResult.status} - ${stepResult.message || '完了'}`])
          })
        }
      } else {
        setLogLines(l => [...l, `エラー: ${data.error || data.results?.error || 'Unknown error'}`])
      }
      
    } catch (error: any) {
      setLogLines(l => [...l, `エラー: ${error.message}`])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">解析パイプライン</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-800 mb-2">プロセス概要</h2>
        <p className="text-blue-700 text-sm mb-3">
          Word2Vec、感情分析、生理データ分析を並列実行し、Spirit確率を計算する統合解析パイプラインです。
          BPMNプロセスに基づいて段階的に処理されます。
        </p>
        <div className="space-y-2 text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>データ検証</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>並列解析（Word2Vec・感情・生理データ）</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>特徴量抽出</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>Spirit確率計算</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            <span>結果集約・統計更新</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-medium">参加者ID:</label>
        <input
          className="border rounded px-2 py-1 w-[560px]"
          value={participantId}
          onChange={e => setParticipantId(e.target.value)}
          placeholder="参加者IDを入力"
        />
        <button
          disabled={running}
          onClick={runAnalysisPipeline}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
        >
          {running ? '実行中...' : '解析実行'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">実行ログ</h2>
          <pre className="border rounded p-3 h-[400px] overflow-auto bg-gray-50 text-sm">
            {logLines.join('\n')}
          </pre>
        </div>
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">実行結果</h2>
          <div className="border rounded p-3 h-[400px] overflow-auto bg-gray-50">
            {result ? (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-semibold text-blue-800">解析サマリー</h3>
                  <div className="text-sm text-blue-700 mt-1">
                    <div>ステータス: {result.results?.status || 'unknown'}</div>
                    <div>Spirit確率: {result.results?.summary?.spiritProbability?.toFixed(3) || 'N/A'}</div>
                    <div>総応答数: {result.results?.summary?.totalResponses || 0}</div>
                    <div>解析時間: {result.results?.summary?.analysisDuration ? `${result.results.summary.analysisDuration}ms` : 'N/A'}</div>
                  </div>
                </div>
                
                {result.results?.steps && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">ステップ詳細</h3>
                    {Object.entries(result.results.steps).map(([stepName, stepResult]: [string, any]) => (
                      <div key={stepName} className={`p-2 border rounded text-sm ${
                        stepResult.status === 'completed' ? 'bg-green-50 border-green-200' :
                        stepResult.status === 'failed' ? 'bg-red-50 border-red-200' :
                        stepResult.status === 'skipped' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="font-medium">{stepName}</div>
                        <div className="text-xs opacity-75">
                          ステータス: {stepResult.status} - {stepResult.message}
                        </div>
                        {stepResult.averageSpiritProbability && (
                          <div className="text-xs opacity-75 mt-1">
                            Spirit確率: {stepResult.averageSpiritProbability.toFixed(3)}
                          </div>
                        )}
                        {stepResult.wordCount && (
                          <div className="text-xs opacity-75 mt-1">
                            単語数: {stepResult.wordCount}, ユニーク: {stepResult.uniqueWords}
                          </div>
                        )}
                        {stepResult.emotionCount && (
                          <div className="text-xs opacity-75 mt-1">
                            感情数: {stepResult.emotionCount}, 信頼度: {stepResult.averageConfidence?.toFixed(3)}
                          </div>
                        )}
                        {stepResult.dataPoints && (
                          <div className="text-xs opacity-75 mt-1">
                            データポイント: {stepResult.dataPoints}, 振幅: {stepResult.averageAmplitude?.toFixed(3)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500">実行結果がここに表示されます</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">解析コンポーネント</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <div>• Word2Vec分析: 単語埋め込みと意味的類似度の計算</div>
          <div>• 感情分析: HumeAIデータによる感情分布と信頼度の分析</div>
          <div>• 生理データ分析: 皮膚電位データの統計的特徴量抽出</div>
          <div>• 特徴量統合: 各分析結果を統合した特徴量ベクトルの作成</div>
          <div>• Spirit確率: 機械学習モデルによるSpirit確率の計算</div>
        </div>
      </div>
    </div>
  )
}
