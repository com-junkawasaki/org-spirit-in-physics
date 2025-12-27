// Merkle DAG: visualizer.package.exports
// @visualizer パッケージのエントリーポイント

export { TimelineVisualization } from '@spirit-in-physics/visualization-components'
export { default as EmotionDistanceVisualization } from './components/EmotionDistanceVisualization'
export { useTimelineData } from './hooks/useTimelineData'
export * from './types'
export { JUNG_STIMULUS_WORDS, type JungWord } from './constants/jung'

// Sub-component exports (optional, for advanced usage)
export { default as TimelineChart } from './components/timeline/TimelineChart'
export { default as KPICards } from './components/timeline/KPICards'
export { default as Force3DControls } from './components/timeline/Force3DControls'
export { default as Force3DWordGraphTypeGPU } from './components/Force3DWordGraphTypeGPU'

