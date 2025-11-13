// Merkle DAG: lib.hume_realtime
// Real-time Hume AI emotion analysis integration

import type { EmotionData } from '../types/demo'
import { normalizeEmotionName, EMOTION_KEYS } from './emotion-normalization'

export interface HumeAnalysisResult {
  emotions: EmotionData[]
  timestamp: number
  processingTime: number
}

/**
 * Capture video/audio frame from MediaStream and send to Hume AI API
 */
export async function analyzeEmotionRealtime(
  videoBlob: Blob,
  audioBlob?: Blob
): Promise<HumeAnalysisResult> {
  const startTime = Date.now()

  try {
    // Create FormData for API request
    const formData = new FormData()
    formData.append('video', videoBlob, 'video.webm')
    if (audioBlob) {
      formData.append('audio', audioBlob, 'audio.webm')
    }

    // Send to API route
    const response = await fetch('/api/hume-analyze', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Hume API error: ${response.statusText}`)
    }

    const data = await response.json()
    const processingTime = Date.now() - startTime

    // Process Hume predictions into normalized emotion vectors
    const emotions = processHumePredictions(data.predictions || [])

    return {
      emotions,
      timestamp: Date.now(),
      processingTime,
    }
  } catch (error) {
    console.error('Error analyzing emotions:', error)
    // Return empty emotions on error (graceful degradation)
    return {
      emotions: [],
      timestamp: Date.now(),
      processingTime: Date.now() - startTime,
    }
  }
}

/**
 * Process Hume AI predictions into normalized emotion data
 */
function processHumePredictions(predictions: any[]): EmotionData[] {
  const emotions: EmotionData[] = []
  const emotionMap = new Map<string, { score: number; fileType?: string }>()

  for (const prediction of predictions) {
    // Handle face predictions
    if (prediction.face?.predictions) {
      for (const facePred of prediction.face.predictions) {
        if (facePred.emotions) {
          for (const emotion of facePred.emotions) {
            const normalized = normalizeEmotionName(emotion.name)
            if (normalized) {
              const key = `${normalized}_face`
              const current = emotionMap.get(key) || { score: 0, fileType: 'face' }
              emotionMap.set(key, {
                score: Math.max(current.score, emotion.score || 0),
                fileType: 'face',
              })
            }
          }
        }
      }
    }

    // Handle prosody predictions
    if (prediction.prosody?.predictions) {
      for (const prosodyPred of prediction.prosody.predictions) {
        if (prosodyPred.emotions) {
          for (const emotion of prosodyPred.emotions) {
            const normalized = normalizeEmotionName(emotion.name)
            if (normalized) {
              const key = `${normalized}_prosody`
              const current = emotionMap.get(key) || { score: 0, fileType: 'prosody' }
              emotionMap.set(key, {
                score: Math.max(current.score, emotion.score || 0),
                fileType: 'prosody',
              })
            }
          }
        }
      }
    }

    // Handle burst predictions
    if (prediction.burst?.predictions) {
      for (const burstPred of prediction.burst.predictions) {
        if (burstPred.emotions) {
          for (const emotion of burstPred.emotions) {
            const normalized = normalizeEmotionName(emotion.name)
            if (normalized) {
              const key = `${normalized}_burst`
              const current = emotionMap.get(key) || { score: 0, fileType: 'burst' }
              emotionMap.set(key, {
                score: Math.max(current.score, emotion.score || 0),
                fileType: 'burst',
              })
            }
          }
        }
      }
    }
  }

  // Convert map to array
  for (const [key, value] of emotionMap.entries()) {
    const emotionName = key.split('_')[0]
    emotions.push({
      name: emotionName,
      score: value.score,
      fileType: value.fileType as 'face' | 'prosody' | 'burst' | 'language',
    })
  }

  // Sort by score descending
  return emotions.sort((a, b) => b.score - a.score)
}

/**
 * Capture frame from MediaStream as Blob
 */
export async function captureVideoFrame(stream: MediaStream, durationMs: number = 2000): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
    })

    const chunks: Blob[] = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' })
      resolve(blob)
    }

    mediaRecorder.onerror = (error) => {
      reject(new Error('Failed to capture video frame'))
    }

    mediaRecorder.start()

    setTimeout(() => {
      mediaRecorder.stop()
    }, durationMs)
  })
}

/**
 * Capture audio from MediaStream as Blob
 */
export async function captureAudioFrame(stream: MediaStream, durationMs: number = 2000): Promise<Blob | null> {
  const audioTracks = stream.getAudioTracks()
  if (audioTracks.length === 0) {
    return null
  }

  return new Promise((resolve, reject) => {
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'audio/webm',
    })

    const chunks: Blob[] = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunks.push(event.data)
      }
    }

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      resolve(blob)
    }

    mediaRecorder.onerror = (error) => {
      reject(new Error('Failed to capture audio frame'))
    }

    mediaRecorder.start()

    setTimeout(() => {
      mediaRecorder.stop()
    }, durationMs)
  })
}

