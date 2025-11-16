// Merkle DAG: store.demo_store
// Zustand store for demo app state management

import { create } from 'zustand'

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
}

interface DemoStoreActions {
  addToBatchQueue: (item: BatchQueueItem) => void
  processBatchQueue: () => BatchQueueItem[]
  clearBatchQueue: () => void
}

type DemoStore = DemoStoreState & DemoStoreActions

export const useDemoStore = create<DemoStore>((set, get) => ({
  batchQueue: [],

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
}))

