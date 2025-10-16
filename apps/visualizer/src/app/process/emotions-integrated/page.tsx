'use client'

import React, { useState } from 'react'

const DEFAULT_IDS = [
  '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413'
]

export default function ProcessEmotionsIntegratedPage() {
  const [participantIds, setParticipantIds] = useState(DEFAULT_IDS.join(','))
  const [sessionIds, setSessionIds] = useState('')
  const [running, setRunning] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)

  async function runEmotionImport() {
    setRunning(true)
    setLogLines([])
    setResult(null)
    
    const ids = participantIds.split(',').map(s => s.trim()).filter(Boolean)
    const sessionIdList = sessionIds.split(',').map(s => s.trim()).filter(Boolean)
    
    try {
      setLogLines(l => [...l, '統合感情データインポート開始...'])
      
      // 各参加者・セッションの組み合わせで処理
      const results = []
      
      for (const participantId of ids) {
        // セッションIDが指定されていない場合は、デフォルトセッションIDを生成
        const targetSessionIds = sessionIdList.length > 0 ? sessionIdList : [`session_${participantId}_default`]
        
        for (const sessionId of targetSessionIds) {
          setLogLines(l => [...l, `参加者 ${participantId.slice(0, 8)}... セッション ${sessionId} を処理中...`])
          
          const response = await fetch('/api/admin/import/emotions/integrated', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ participantId, sessionId })
          })
          
          const data = await response.json()
          results.push(data)
          
          if (data.success) {
            setLogLines(l => [...l, `✅ 成功: ${data.results.statistics.totalEmotions}件の感情データをインポート`])
            
            // 各フェーズの結果をログに追加
            Object.entries(data.results.phases).forEach(([phase, status]: [string, any]) => {
              setLogLines(l => [...l, `  ${phase}: ${status.status} - ${status.message}`])
            })
          } else {
            setLogLines(l => [...l, `❌ 失敗: ${data.error}`])
          }
        }
      }
      
      setResult({ results })
      
      const successCount = results.filter(r => r.success).length
      const totalEmotions = results.reduce((sum, r) => sum + (r.results?.statistics?.totalEmotions || 0), 0)
      
      setLogLines(l => [...l, `インポート完了: ${successCount}/${results.length}件成功, 総感情データ数: ${totalEmotions}件`])
      
    } catch (error: any) {
      setLogLines(l => [...l, `エラー: ${error.message}`])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">統合感情データインポート</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-800 mb-2">BPMNプロセス概要</h2>
        <div className="text-blue-700 text-sm space-y-2">
          <p><strong>Phase 1:</strong> 参加者存在確認</p>
          <p><strong>Phase 2:</strong> HumeAIデータスキャン</p>
          <p><strong>Phase 3:</strong> Registryファイルスキャン</p>
          <p><strong>Phase 4:</strong> 並列感情データ処理 (Burst, Face, Language, Prosody)</p>
          <p><strong>Phase 5:</strong> データ統合・Neo4j保存</p>
          <p><strong>Phase 6:</strong> 統計情報更新</p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="font-semibold text-green-800 mb-2">処理対象データ</h2>
        <div className="text-green-700 text-sm space-y-1">
          <p>• <strong>Burst:</strong> 感情の爆発的表現データ</p>
          <p>• <strong>Face:</strong> 顔表情から読み取る感情データ</p>
          <p>• <strong>Language:</strong> 言語表現から分析する感情データ</p>
          <p>• <strong>Prosody:</strong> 音韻・韻律から分析する感情データ</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="font-medium">参加者ID:</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={participantIds}
            onChange={e => setParticipantIds(e.target.value)}
            placeholder="カンマ区切りで参加者IDを入力"
          />
        </div>
        
        <div className="space-y-2">
          <label className="font-medium">セッションID (オプション):</label>
          <input
            className="border rounded px-2 py-1 w-full"
            value={sessionIds}
            onChange={e => setSessionIds(e.target.value)}
            placeholder="カンマ区切りでセッションIDを入力（空の場合は自動生成）"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          disabled={running}
          onClick={runEmotionImport}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
        >
          {running ? '実行中...' : '統合インポート実行'}
        </button>
        
        {running && (
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm text-gray-600">処理中...</span>
          </div>
        )}
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
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <p className="text-gray-500">実行結果がここに表示されます</p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h2 className="font-semibold text-yellow-800 mb-2">注意事項</h2>
        <div className="text-yellow-700 text-sm space-y-1">
          <p>• 各参加者・セッションの組み合わせでHumeAIデータを検索します</p>
          <p>• Registryファイル内のCSVファイル（burst.csv, face.csv, language.csv, prosody.csv）を処理します</p>
          <p>• 感情データはNeo4jのEmotionAnalysisノードとして保存されます</p>
          <p>• セッションIDが指定されていない場合は、デフォルトセッションIDが生成されます</p>
        </div>
      </div>
    </div>
  )
}
