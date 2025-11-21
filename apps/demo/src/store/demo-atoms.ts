// Merkle DAG: store.demo_atoms
// Jotai atoms for demo app state management

import { atom } from 'jotai'
import type { WordEmotionData } from '../types/demo'

export interface BatchQueueItem {
  word: string
  wordIndex: number
  timestamp: number
  videoBlob: Blob
  audioBlob?: Blob
  stepOrder: number
}

// Base atoms
export const batchQueueAtom = atom<BatchQueueItem[]>([])
export const wordEmotionDataAtom = atom<WordEmotionData[]>([])
export const lastUpdateTimeAtom = atom<number>(0)

// Derived atoms (automatically optimized)
export const batchQueueLengthAtom = atom((get) => get(batchQueueAtom).length)
export const wordEmotionDataLengthAtom = atom((get) => get(wordEmotionDataAtom).length)

// Debounce timer for wordEmotionData updates
let debounceTimer: NodeJS.Timeout | null = null
const pendingUpdates: WordEmotionData[] = []

// Write atoms with debounce logic
export const addWordEmotionDataAtom = atom(
  null,
  (get, set, { data, options = {} }: { data: WordEmotionData; options?: { skipEmpty?: boolean; debounceMs?: number } }) => {
    const { skipEmpty = true, debounceMs = 200 } = options
    
    // Skip empty emotions if skipEmpty is true
    if (skipEmpty && (!data.emotions || data.emotions.length === 0)) {
      console.log(`[DemoStore] Skipping empty emotion data for word: ${data.word}`)
      return
    }
    
    // Check for duplicates
    const currentData = get(wordEmotionDataAtom)
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
      
      const currentData = get(wordEmotionDataAtom)
      const newData = [...currentData, ...updates]
      console.log(`[DemoStore] Added ${updates.length} word emotion data entries (total: ${newData.length})`)
      
      set(wordEmotionDataAtom, newData)
      set(lastUpdateTimeAtom, Date.now())
    }, debounceMs)
  }
)

export const clearWordEmotionDataAtom = atom(
  null,
  (get, set) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
    pendingUpdates.length = 0
    set(wordEmotionDataAtom, [])
    set(lastUpdateTimeAtom, 0)
  }
)

export const addToBatchQueueAtom = atom(
  null,
  (get, set, item: BatchQueueItem) => {
    const currentQueue = get(batchQueueAtom)
    const newQueue = [...currentQueue, item]
    console.log(`[DemoStore] Added to batch queue: ${item.word}, queue size: ${newQueue.length}`)
    set(batchQueueAtom, newQueue)
  }
)

// processBatchQueue returns a value, so we need a read-write atom
export const processBatchQueueAtom = atom(
  (get) => get(batchQueueAtom), // read: return current queue
  (get, set) => {
    const currentQueue = get(batchQueueAtom)
    if (currentQueue.length === 0) {
      console.log('[DemoStore] Batch queue is empty, nothing to process')
      return []
    }
    
    console.log(`[DemoStore] Processing batch queue: ${currentQueue.length} items`)
    // Clear queue
    set(batchQueueAtom, [])
    return currentQueue
  }
)

export const clearBatchQueueAtom = atom(
  null,
  (get, set) => {
    set(batchQueueAtom, [])
  }
)

