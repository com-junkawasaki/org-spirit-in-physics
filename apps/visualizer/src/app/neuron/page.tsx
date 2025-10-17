'use client'

import { useEffect, useId, useState } from 'react'
import dynamic from 'next/dynamic'
import { DashboardLayout } from '@/components/layout/PageLayout'
import type { ConnectomeScene } from '@/neuron/types'
import { loadSampleConnectomeScene } from '@/neuron/sample'

const NeuronConnectome3D = dynamic(() => import('@/components/NeuronConnectome3D.client'), { ssr: false })

export default function NeuronPage() {
  const [scene, setScene] = useState<ConnectomeScene | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        setLoading(true)
        const s = await loadSampleConnectomeScene('/brain')
        if (!cancelled) setScene(s)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? 'failed to load sample connectome')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [])

  return (
    <DashboardLayout
      header={{
        title: 'Neuron Connectome 3D (Sample)',
        description: '脳の物理アンカーに語・イベントを重ねる最小サンプル',
        backHref: '/dashboard',
        backLabel: 'ダッシュボードへ'
      }}
    >
      {loading && <div className="p-6">読み込み中...</div>}
      {error && <div className="p-6 text-red-600">{error}</div>}
      {scene && <NeuronConnectome3D scene={scene} />}
    </DashboardLayout>
  )
}


