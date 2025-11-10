// Merkle DAG: stores.tooltip
// ツールチップ状態を管理するZustandストア
// TimelineChartの無限ループ問題を解決するため、ツールチップ状態をグローバルに管理

import { create } from 'zustand'
import type { TimelineDataPoint } from '@/components/timeline/types'

interface TooltipState {
  visible: boolean
  x: number
  y: number
  data: TimelineDataPoint | null
  show: (event: MouseEvent, point: TimelineDataPoint) => void
  hide: () => void
}

export const useTooltipStore = create<TooltipState>((set) => ({
  visible: false,
  x: 0,
  y: 0,
  data: null,
  show: (event: MouseEvent, point: TimelineDataPoint) => {
    set({
      visible: true,
      x: event.pageX + 10,
      y: event.pageY - 10,
      data: point,
    })
  },
  hide: () => {
    set({
      visible: false,
      data: null,
    })
  },
}))

