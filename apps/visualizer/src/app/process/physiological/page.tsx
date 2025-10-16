'use client'

import React, { useState } from 'react'

const DEFAULT_IDS = [
  '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413'
]

export default function ProcessPhysiologicalPage() {
  const [participantIds, setParticipantIds] = useState(DEFAULT_IDS.join(','))
  const [running, setRunning] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])
  const [result, setResult] = useState<any>(null)

  async function runPhysiologicalImport() {
    setRunning(true)
    setLogLines([])
    setResult(null)
    
    const ids = participantIds.split(',').map(s => s.trim()).filter(Boolean)
    
    try {
      setLogLines(l => [...l, '生理データインポート開始...'])
      
      const response = await fetch('/api/admin/import/physiological', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ participantIds: ids })
      })
      
      const data = await response.json()
      setResult(data)
      
      if (data.success) {
        const successCount = data.results?.filter((r: any) => r.status === 'success').length || 0
        const totalRecords = data.results?.reduce((sum: number, r: any) => sum + (r.statistics?.totalRecords || 0), 0) || 0
        
        setLogLines(l => [...l, `インポート完了: ${successCount}件の参加者から${totalRecords}件の生理データをインポート`])
        
        if (data.results) {
          data.results.forEach((r: any) => {
            if (r.status === 'success') {
              setLogLines(l => [...l, `${r.participantId}: ${r.status} - ${r.statistics?.totalRecords || 0}件のレコードを処理`])
            } else {
              setLogLines(l => [...l, `${r.participantId}: ${r.status} - ${r.message || 'エラー'}`])
            }
          })
        }
      } else {
        setLogLines(l => [...l, `エラー: ${data.error || 'Unknown error'}`])
      }
      
    } catch (error: any) {
      setLogLines(l => [...l, `エラー: ${error.message}`])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">生理データインポート</h1>
      
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h2 className="font-semibold text-green-800 mb-2">プロセス概要</h2>
        <p className="text-green-700 text-sm mb-3">
          参加者の生理データ（皮膚電位、心拍数など）をCSVファイルから読み取り、Neo4jにインポートします。
          BPMNプロセスに基づいて段階的に処理されます。
        </p>
        <div className="space-y-2 text-sm text-green-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>参加者存在確認</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>生理データファイルスキャン</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>CSVデータ解析・検証</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>Neo4jバルク挿入</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            <span>関係作成・統計更新</span>
          </div>
        </div>
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
          onClick={runPhysiologicalImport}
          className="px-4 py-2 rounded bg-green-600 text-white disabled:opacity-50 hover:bg-green-700"
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
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                  <h3 className="font-semibold text-blue-800">処理サマリー</h3>
                  <div className="text-sm text-blue-700 mt-1">
                    <div>総参加者数: {result.total}</div>
                    <div>処理済み: {result.processed}</div>
                    <div>成功: {result.results?.filter((r: any) => r.status === 'success').length || 0}</div>
                    <div>失敗: {result.results?.filter((r: any) => r.status === 'error').length || 0}</div>
                    <div>スキップ: {result.results?.filter((r: any) => r.status === 'skipped').length || 0}</div>
                  </div>
                </div>
                
                {result.results && result.results.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="font-semibold">詳細結果</h3>
                    {result.results.map((r: any, index: number) => (
                      <div key={index} className={`p-2 border rounded text-sm ${
                        r.status === 'success' ? 'bg-green-50 border-green-200' :
                        r.status === 'error' ? 'bg-red-50 border-red-200' :
                        'bg-yellow-50 border-yellow-200'
                      }`}>
                        <div className="font-medium">{r.participantId}</div>
                        <div className="text-xs opacity-75">
                          ステータス: {r.status} - {r.message}
                        </div>
                        {r.statistics && (
                          <div className="text-xs opacity-75 mt-1">
                            レコード数: {r.statistics.totalRecords || 0}, 
                            ファイル数: {r.statistics.processedFiles || 0}
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
        <h3 className="font-semibold text-gray-800 mb-2">サポートファイル形式</h3>
        <div className="text-sm text-gray-700 space-y-1">
          <div>• CSVファイル: 2025-08を含むファイル名（例: physiological_data_2025-08.csv）</div>
          <div>• JSONファイル: physiologicalを含むファイル名（例: physiological_analysis.json）</div>
          <div>• データ形式: Time_Sec, Ch1-Ch8のチャンネルデータ</div>
          <div>• メタデータ: Dateフィールドでタイムスタンプ情報</div>
        </div>
      </div>
    </div>
  )
}
