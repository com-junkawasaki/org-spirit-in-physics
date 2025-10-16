'use client'

import React, { useState } from 'react'

const DEFAULT_PARTICIPANT_ID = '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413'

export default function IntegratedPipelinePage() {
  const [participantId, setParticipantId] = useState(DEFAULT_PARTICIPANT_ID)
  const [running, setRunning] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)

  async function runIntegratedPipeline() {
    setRunning(true)
    setLogLines([])
    setResult(null)
    
    try {
      setLogLines(l => [...l, '統合データパイプライン開始...'])
      
      const response = await fetch('/api/pipeline/integrated', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          participantId,
          options: {
            enableSessionImport: true,
            enableEmotionImport: true,
            enablePhysiologicalImport: true,
            enableWord2VecAnalysis: true,
            enableEmotionAnalysis: true,
            enablePhysiologicalAnalysis: true
          }
        })
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        setLogLines(l => [...l, `統合パイプライン完了: Spirit確率 ${data.results.summary?.analysisSummary?.spiritProbability?.toFixed(3) || 'N/A'}`])
        
        // 各フェーズの結果をログに追加
        if (data.results.phases) {
          Object.entries(data.results.phases).forEach(([phaseName, phaseResult]: [string, any]) => {
            if (phaseName === 'experimentCreation') {
              setLogLines(l => [...l, `実験作成: ${phaseResult.success ? '成功' : '失敗'} (Experiment ID: ${phaseResult.experimentId || 'N/A'})`])
            } else if (phaseName === 'dataImport') {
              setLogLines(l => [...l, `データインポート: セッション ${phaseResult.sessionImport?.success ? '成功' : '失敗'}, 感情 ${phaseResult.emotionImport?.success ? '成功' : '失敗'}, 生理 ${phaseResult.physiologicalImport?.success ? '成功' : '失敗'}`])
            } else if (phaseName === 'analysis') {
              setLogLines(l => [...l, `解析: Word2Vec ${phaseResult.word2VecAnalysis?.status}, 感情 ${phaseResult.emotionAnalysis?.status}, 生理 ${phaseResult.physiologicalAnalysis?.status}`])
            } else {
              setLogLines(l => [...l, `${phaseName}: ${phaseResult.status} - ${phaseResult.message || '完了'}`])
            }
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
      <h1 className="text-2xl font-bold">統合データパイプライン</h1>
      
      <div className="bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-800 mb-2">プロセス概要</h2>
        <p className="text-blue-700 text-sm mb-3">
          データインポートから解析までの統合パイプラインです（Experiment階層対応）。参加者→実験→セッション階層でデータを管理し、
          セッション、感情、生理データを並列インポート後、Word2Vec、感情分析、生理データ分析を並列実行してSpirit確率を計算します。
        </p>
        <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
          <div>
            <h3 className="font-semibold mb-2">インポートフェーズ</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>参加者存在確認</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>実験作成（Experiment階層）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>並列データインポート</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>データ検証（Experiment階層）</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold mb-2">解析フェーズ</h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>並列解析実行（Experiment階層）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>特徴量抽出（Experiment階層）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Spirit確率計算（Experiment階層）</span>
              </div>
            </div>
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
          onClick={runIntegratedPipeline}
          className="px-4 py-2 rounded bg-gradient-to-r from-blue-600 to-green-600 text-white disabled:opacity-50 hover:from-blue-700 hover:to-green-700"
        >
          {running ? '実行中...' : '統合パイプライン実行'}
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
                <div className="p-3 bg-gradient-to-r from-blue-50 to-green-50 border border-blue-200 rounded">
                  <h3 className="font-semibold text-blue-800">パイプラインサマリー</h3>
                  <div className="text-sm text-blue-700 mt-1">
                    <div>ステータス: {result.results?.status || 'unknown'}</div>
                    <div>Spirit確率: {result.results?.summary?.analysisSummary?.spiritProbability?.toFixed(3) || 'N/A'}</div>
                    <div>データ完全性: {result.results?.summary?.analysisSummary?.dataCompleteness?.toFixed(3) || 'N/A'}</div>
                    <div>解析品質: {result.results?.summary?.analysisSummary?.analysisQuality || 'N/A'}</div>
                    <div>パイプライン時間: {result.results?.summary?.pipelineDuration ? `${result.results.summary.pipelineDuration}ms` : 'N/A'}</div>
                  </div>
                </div>
                
                <div className="p-3 bg-green-50 border border-green-200 rounded">
                  <h3 className="font-semibold text-green-800">インポートサマリー</h3>
                  <div className="text-sm text-green-700 mt-1">
                    <div>セッション: {result.results?.summary?.importSummary?.sessions || 0}件</div>
                    <div>感情: {result.results?.summary?.importSummary?.emotions || 0}件</div>
                    <div>生理データ: {result.results?.summary?.importSummary?.physiological || 0}件</div>
                  </div>
                </div>
                
                {result.results?.phases && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">フェーズ詳細</h3>
                    {Object.entries(result.results.phases).map(([phaseName, phaseResult]: [string, any]) => (
                      <div key={phaseName} className={`p-2 border rounded text-sm ${
                        phaseResult.status === 'completed' ? 'bg-green-50 border-green-200' :
                        phaseResult.status === 'failed' ? 'bg-red-50 border-red-200' :
                        phaseResult.status === 'skipped' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-gray-50 border-gray-200'
                      }`}>
                        <div className="font-medium">{phaseName}</div>
                        <div className="text-xs opacity-75">
                          ステータス: {phaseResult.status} - {phaseResult.message}
                        </div>
                        {phaseName === 'dataImport' && (
                          <div className="text-xs opacity-75 mt-1">
                            セッション: {phaseResult.sessionImport?.success ? '成功' : '失敗'}, 
                            感情: {phaseResult.emotionImport?.success ? '成功' : '失敗'}, 
                            生理: {phaseResult.physiologicalImport?.success ? '成功' : '失敗'}
                          </div>
                        )}
                        {phaseName === 'analysis' && (
                          <div className="text-xs opacity-75 mt-1">
                            Word2Vec: {phaseResult.word2VecAnalysis?.status}, 
                            感情: {phaseResult.emotionAnalysis?.status}, 
                            生理: {phaseResult.physiologicalAnalysis?.status}
                          </div>
                        )}
                        {phaseResult.averageSpiritProbability && (
                          <div className="text-xs opacity-75 mt-1">
                            Spirit確率: {phaseResult.averageSpiritProbability.toFixed(3)}
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
        <h3 className="font-semibold text-gray-800 mb-2">統合パイプラインコンポーネント</h3>
        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h4 className="font-semibold mb-1">インポートコンポーネント（Experiment階層対応）</h4>
            <div className="space-y-1">
              <div>• 実験作成: Participant → Experiment → Session階層</div>
              <div>• セッションデータ: 実験セッションと応答データ</div>
              <div>• 感情データ: HumeAI感情分析結果</div>
              <div>• 生理データ: 皮膚電位などの生体信号</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-1">解析コンポーネント（Experiment階層対応）</h4>
            <div className="space-y-1">
              <div>• Word2Vec分析: Experiment階層経由の単語埋め込み</div>
              <div>• 感情分析: Experiment階層経由の感情分布</div>
              <div>• 生理データ分析: Experiment階層経由の統計的特徴量</div>
              <div>• Spirit確率: Experiment階層対応の統合モデル</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
