'use client'

import React, { useEffect, useRef, useState } from 'react'

const DEFAULT_IDS = [
  '2a0d7a69-f953-4c29-87a5-8a8e4e8bd413'
]

export default function ProcsPage() {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const modelerRef = useRef<any>(null)
  const [participantIds, setParticipantIds] = useState(DEFAULT_IDS.join(','))
  const [running, setRunning] = useState(false)
  const [logLines, setLogLines] = useState<string[]>([])

  useEffect(() => {
    if (!canvasRef.current) return
    let mounted = true

    async function init() {
      try {
        // Try canonical path first
        const { default: BpmnModeler } = await import('bpmn-js/lib/Modeler').catch(() => ({ default: undefined as any }))
        let ModelerCtor: any = BpmnModeler
        if (!ModelerCtor) {
          // Fallback to UMD bundle
          const mod = await import('bpmn-js/dist/bpmn-modeler.production.min.js')
          ModelerCtor = (mod as any).default || (mod as any)
        }
        if (!mounted) return
        const modeler = new ModelerCtor({ container: canvasRef.current! })
        modelerRef.current = modeler

        const res = await fetch('/bpmn/import_process.bpmn')
        const xml = await res.text()
        await modeler.importXML(xml)
        const canvas = modeler.get('canvas')
        canvas.zoom('fit-viewport')
      } catch (e) {
        console.error('BPMN init error:', e)
      }
    }
    init()

    return () => { 
      if (modelerRef.current) {
        modelerRef.current.destroy()
      }
    }
  }, [])

  async function runImportSequential() {
    setRunning(true)
    const ids = participantIds.split(',').map(s => s.trim()).filter(Boolean)
    const body = (participantIds: string[]) => ({
      headers: { 'Content-Type': 'application/json' },
      method: 'POST',
      body: JSON.stringify({ participantIds })
    })
    try {
      setLogLines(l => [...l, 'Import Participants...'])
      const r1 = await fetch('/api/admin/import/participants', body(ids)); await r1.text()
      setLogLines(l => [...l, 'Import Sessions...'])
      const r2 = await fetch('/api/admin/import/sessions', body(ids)); await r2.text()
      setLogLines(l => [...l, 'Import Emotions...'])
      const r3 = await fetch('/api/admin/import/emotions', body(ids)); await r3.text()
      setLogLines(l => [...l, 'Check Status...'])
      const status = await fetch(`/api/admin/import/status?participantIds=${ids.join(',')}`)
      const data = await status.json()
      setLogLines(l => [...l, JSON.stringify(data.summary)])
    } catch (e: any) {
      setLogLines(l => [...l, `Error: ${e.message}`])
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">プロセス実行（BPMN）</h1>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="font-semibold text-blue-800 mb-2">プロセス概要</h2>
        <p className="text-blue-700 text-sm mb-3">
          参加者データ、セッションデータ、感情データを順次インポートする統合プロセスです。
        </p>
        <div className="flex gap-2 flex-wrap">
          <a href="/process/participants" className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-sm hover:bg-blue-200">
            👤 参加者インポート
          </a>
          <a href="/process/sessions" className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200">
            📋 セッションインポート
          </a>
          <a href="/process/emotions" className="px-3 py-1 bg-purple-100 text-purple-800 rounded text-sm hover:bg-purple-200">
            😊 感情データインポート
          </a>
          <a href="/process/physiological" className="px-3 py-1 bg-green-100 text-green-800 rounded text-sm hover:bg-green-200">
            💓 生理データインポート
          </a>
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
          onClick={runImportSequential}
          className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50 hover:bg-blue-700"
        >{running ? '実行中...' : '統合実行'}</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border rounded h-[520px]" ref={canvasRef} />
        <pre className="border rounded p-3 h-[520px] overflow-auto bg-gray-50 text-sm">
          {logLines.join('\n')}
        </pre>
      </div>
    </div>
  )
}


