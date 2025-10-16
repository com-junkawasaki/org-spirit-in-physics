'use client'

import React, { useState } from 'react'

const DEFAULT_IDS = [
  '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413'
]

export default function ProcessParticipantsPage() {
  const [participantIds, setParticipantIds] = useState(DEFAULT_IDS.join(','))
  const [running, setRunning] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)

  async function runParticipantImport() {
    setRunning(true)
    setLogLines([])
    setResult(null)
    
    const ids = participantIds.split(',').map(s => s.trim()).filter(Boolean)
    
    try {
      setLogLines(l => [...l, '参加者データインポート開始...'])
      
      const response = await fetch('/api/admin/import/participants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: ids })
      })
      
      const data = await response.json()
      setResult(data)
      
      setLogLines(l => [...l, `インポート完了: ${data.summary?.importedParticipants || 0}件の参加者をインポート`])
      
      if (data.results) {
        data.results.forEach((r: any) => {
          setLogLines(l => [...l, `${r.participantId}: ${r.status} - ${r.message || '成功'}`])
        })
      }
      
    } catch (error: any) {
      setLogLines(l => [...l, `エラー: ${error.message}`])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">参加者データインポート</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-800 mb-2">プロセス概要</h2>
        <p className="text-blue-700 text-sm">
          参加者ディレクトリから consent.json ファイルを読み取り、Neo4j に参加者データをインポートします。
        </p>
      </div>

      <div className="flex items-center gap-2">
        <label className="font-medium">参加者ID:</label>
        <input
          className="border rounded px-2 py-1 w-[560px]"
          value={participantIds}
          onChange={e => setParticipantIds(e.target.value)}
          placeholder="カンマ区切りで参加者IDを入力"
        />
        <button
          disabled={running}
          onClick={runParticipantImport}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
        >
          {running ? '実行中...' : 'インポート実行'}
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
              <pre className="text-sm">{JSON.stringify(result, null, 2)}</pre>
            ) : (
              <p className="text-gray-500">実行結果がここに表示されます</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
