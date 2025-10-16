'use client'

import React, { useEffect, useRef, useState } from 'react'
import BpmnModeler from 'bpmn-js/lib/Modeler'

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
    const modeler = new BpmnModeler({ container: canvasRef.current })
    modelerRef.current = modeler

    async function loadDiagram() {
      const res = await fetch('/bpmn/import_process.bpmn')
      const xml = await res.text()
      await modeler.importXML(xml)
      const canvas = modeler.get('canvas')
      canvas.zoom('fit-viewport')
    }
    loadDiagram()

    return () => { modeler.destroy() }
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
      <div className="flex items-center gap-2">
        <input
          className="border rounded px-2 py-1 w-[560px]"
          value={participantIds}
          onChange={e => setParticipantIds(e.target.value)}
        />
        <button
          disabled={running}
          onClick={runImportSequential}
          className="px-3 py-1 rounded bg-blue-600 text-white disabled:opacity-50"
        >{running ? '実行中...' : '実行'}</button>
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


