// Merkle DAG: store.demo_store
// Zustand store for demo app state management

import { create } from 'zustand'
import type { WordEmotionData } from '../types/demo'

export interface BatchQueueItem {
  word: string
  wordIndex: number
  timestamp: number
  videoBlob: Blob
  audioBlob?: Blob
  stepOrder: number
}

interface DemoStoreState {
  batchQueue: BatchQueueItem[]
  wordEmotionData: WordEmotionData[]
  lastUpdateTime: number
}

interface DemoStoreActions {
  addToBatchQueue: (item: BatchQueueItem) => void
  processBatchQueue: () => BatchQueueItem[]
  clearBatchQueue: () => void
  addWordEmotionData: (data: WordEmotionData, options?: { skipEmpty?: boolean; debounceMs?: number }) => void
  clearWordEmotionData: () => void
  getWordEmotionData: () => WordEmotionData[]
}

type DemoStore = DemoStoreState & DemoStoreActions

// Debounce timer for wordEmotionData updates
let debounceTimer: NodeJS.Timeout | null = null
const pendingUpdates: WordEmotionData[] = []

export const useDemoStore = create<DemoStore>((set, get) => ({
  batchQueue: [],
  wordEmotionData: [],
  lastUpdateTime: 0,

  addToBatchQueue: (item: BatchQueueItem) => {
    set((state) => {
      const newQueue = [...state.batchQueue, item]
      console.log(`[DemoStore] Added to batch queue: ${item.word}, queue size: ${newQueue.length}`)
      return { batchQueue: newQueue }
    })
  },

  processBatchQueue: () => {
    const currentQueue = get().batchQueue
    if (currentQueue.length === 0) {
      console.log('[DemoStore] Batch queue is empty, nothing to process')
      return []
    }
    
    console.log(`[DemoStore] Processing batch queue: ${currentQueue.length} items`)
    // Clear queue and return items to process
    set({ batchQueue: [] })
    return currentQueue
  },

  clearBatchQueue: () => {
    set({ batchQueue: [] })
  },

  addWordEmotionData: (data: WordEmotionData, options = {}) => {
    const { skipEmpty = true, debounceMs = 100 } = options
    
    // Skip empty emotions if skipEmpty is true
    if (skipEmpty && (!data.emotions || data.emotions.length === 0)) {
      console.log(`[DemoStore] Skipping empty emotion data for word: ${data.word}`)
      return
    }
    
    // Check for duplicates
    const currentData = get().wordEmotionData
    const isDuplicate = currentData.some(
      d => d.word === data.word && Math.abs(d.timestamp - data.timestamp) < 1000
    )
    if (isDuplicate) {
      console.log(`[DemoStore] Skipping duplicate entry for word: ${data.word}`)
      return
    }
    
    // Add to pending updates
    pendingUpdates.push(data)
    
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    // Set new timer for debounced update
    debounceTimer = setTimeout(() => {
      const updates = [...pendingUpdates]
      pendingUpdates.length = 0 // Clear pending updates
      
      set((state) => {
        const newData = [...state.wordEmotionData, ...updates]
        console.log(`[DemoStore] Added ${updates.length} word emotion data entries (total: ${newData.length})`)
        return { 
          wordEmotionData: newData,
          lastUpdateTime: Date.now()
        }
      })
    }, debounceMs)
  },

  clearWordEmotionData: () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    pendingUpdates.length = 0
    set({ wordEmotionData: [], lastUpdateTime: 0 })
  },

  getWordEmotionData: () => {
    return get().wordEmotionData
  },
}))

