// Merkle DAG: lib.demo.store.demo_atoms
// Jotai atoms for demo app state management

import { atom } from 'jotai'
import type { WordEmotionData } from '@/types/demo/demo'

export interface BatchQueueItem {
  word: string
  wordIndex: number
  timestamp: number
  videoBlob: Blob
  audioBlob?: Blob
  stepOrder: number
}

// Batch queue atom
export const batchQueueAtom = atom<BatchQueueItem[]>([])

// Derived atom for batch queue length
export const batchQueueLengthAtom = atom((get) => get(batchQueueAtom).length)

// Atom for adding to batch queue
export const addToBatchQueueAtom = atom(
  null,
  (_get, set, item: BatchQueueItem) => {
    const currentQueue = _get(batchQueueAtom)
    set(batchQueueAtom, [...currentQueue, item])
  }
)

// Atom for processing batch queue (returns items and clears queue)
export const processBatchQueueAtom = atom(
  (get) => get(batchQueueAtom),
  (get, set) => {
    const currentQueue = get(batchQueueAtom)
    set(batchQueueAtom, [])
    return currentQueue
  }
)

// Atom for clearing batch queue
export const clearBatchQueueAtom = atom(null, (_get, set) => {
  set(batchQueueAtom, [])
})

// Word emotion data atom
export const wordEmotionDataAtom = atom<WordEmotionData[]>([])

// Derived atom for word emotion data length
export const wordEmotionDataLengthAtom = atom((get) => get(wordEmotionDataAtom).length)

// Derived atom for last update time
export const lastUpdateTimeAtom = atom((get) => {
  const data = get(wordEmotionDataAtom)
  if (data.length === 0) return 0
  return Math.max(...data.map((d) => d.timestamp))
})

// Options for adding word emotion data
export interface AddWordEmotionDataOptions {
  skipEmpty?: boolean
  debounceMs?: number
}

// Atom for adding word emotion data
export const addWordEmotionDataAtom = atom(
  null,
  (_get, set, { data, options }: { data: WordEmotionData; options?: AddWordEmotionDataOptions }) => {
    const currentData = _get(wordEmotionDataAtom)
    
    // Skip empty data if option is set
    if (options?.skipEmpty && (!data.emotions || data.emotions.length === 0)) {
      return
    }
    
    // Check for duplicates (same word and timestamp)
    const isDuplicate = currentData.some(
      (d) => d.word === data.word && d.timestamp === data.timestamp
    )
    
    if (isDuplicate) {
      return
    }
    
    // Add new data
    set(wordEmotionDataAtom, [...currentData, data])
  }
)

// Atom for clearing word emotion data
export const clearWordEmotionDataAtom = atom(null, (_get, set) => {
  set(wordEmotionDataAtom, [])
})

