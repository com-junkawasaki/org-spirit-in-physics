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
 * Handles both direct predictions format and results format from API
 */
function processHumePredictions(predictions: any[]): EmotionData[] {
  const emotions: EmotionData[] = []
  const emotionMap = new Map<string, { score: number; fileType?: string }>()

  console.log('Processing Hume predictions:', JSON.stringify(predictions).substring(0, 500))

  for (const prediction of predictions) {
    // Handle face predictions - support both formats
    const faceData = prediction.face || (prediction.results?.[0] && prediction.results[0].face)
    if (faceData) {
      const facePredictions = faceData.predictions || faceData.results?.[0]?.predictions || []
      for (const facePred of facePredictions) {
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

    // Handle prosody predictions - support both formats
    const prosodyData = prediction.prosody || (prediction.results?.[0] && prediction.results[0].prosody)
    if (prosodyData) {
      const prosodyPredictions = prosodyData.predictions || prosodyData.results?.[0]?.predictions || []
      for (const prosodyPred of prosodyPredictions) {
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

    // Handle burst predictions - support both formats
    const burstData = prediction.burst || (prediction.results?.[0] && prediction.results[0].burst)
    if (burstData) {
      const burstPredictions = burstData.predictions || burstData.results?.[0]?.predictions || []
      for (const burstPred of burstPredictions) {
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

    // Handle direct results format (if predictions array contains results directly)
    if (prediction.results && Array.isArray(prediction.results)) {
      for (const result of prediction.results) {
        if (result.predictions && Array.isArray(result.predictions)) {
          for (const pred of result.predictions) {
            if (pred.emotions && Array.isArray(pred.emotions)) {
              for (const emotion of pred.emotions) {
                const normalized = normalizeEmotionName(emotion.name)
                if (normalized) {
                  // Determine file type from prediction structure
                  const fileType = prediction.face ? 'face' : prediction.prosody ? 'prosody' : prediction.burst ? 'burst' : 'language'
                  const key = `${normalized}_${fileType}`
                  const current = emotionMap.get(key) || { score: 0, fileType }
                  emotionMap.set(key, {
                    score: Math.max(current.score, emotion.score || 0),
                    fileType: fileType as 'face' | 'prosody' | 'burst' | 'language',
                  })
                }
              }
            }
          }
        }
      }
    }
  }

  // Convert map to array - aggregate scores for same emotion from different sources
  const aggregatedEmotions = new Map<string, { score: number; fileTypes: Set<string> }>()
  for (const [key, value] of emotionMap.entries()) {
    const emotionName = key.split('_')[0]
    const current = aggregatedEmotions.get(emotionName) || { score: 0, fileTypes: new Set<string>() }
    aggregatedEmotions.set(emotionName, {
      score: Math.max(current.score, value.score),
      fileTypes: current.fileTypes.add(value.fileType || 'language'),
    })
  }

  // Convert to EmotionData array
  for (const [emotionName, data] of aggregatedEmotions.entries()) {
    emotions.push({
      name: emotionName,
      score: data.score,
      fileType: Array.from(data.fileTypes)[0] as 'face' | 'prosody' | 'burst' | 'language',
    })
  }

  console.log('Processed emotions:', emotions.map(e => `${e.name}:${e.score.toFixed(3)}`).join(', '))

  // Sort by score descending
  return emotions.sort((a, b) => b.score - a.score)
}

/**
 * Capture frame from MediaStream as Blob
 */
export async function captureVideoFrame(stream: MediaStream, durationMs: number = 2000): Promise<Blob> {
  // Check if MediaRecorder is supported
  let mimeType = 'video/webm;codecs=vp9'
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8'
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm'
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    console.warn('No supported video MIME type found, using empty blob')
    return new Blob([], { type: 'video/webm' })
  }

  return new Promise((resolve, reject) => {
    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      })

      const chunks: Blob[] = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType })
        resolve(blob)
      }

      mediaRecorder.onerror = (error) => {
        console.warn('MediaRecorder error:', error)
        // Return empty blob instead of rejecting
        resolve(new Blob([], { type: mimeType }))
      }

      mediaRecorder.start()

      setTimeout(() => {
        try {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
          } else {
            // Already stopped, resolve with empty blob
            resolve(new Blob([], { type: mimeType }))
          }
        } catch (err) {
          console.warn('Error stopping MediaRecorder:', err)
          resolve(new Blob([], { type: mimeType }))
        }
      }, durationMs)
    } catch (err) {
      console.warn('Failed to create MediaRecorder:', err)
      // Return empty blob instead of rejecting
      resolve(new Blob([], { type: mimeType }))
    }
  })
}

/**
 * Capture audio from MediaStream as Blob
 */
export async function captureAudioFrame(stream: MediaStream, durationMs: number = 2000): Promise<Blob | null> {
  if (!stream) {
    console.warn('No stream provided for audio capture')
    return null
  }

  // Check if audio tracks exist
  const audioTracks = stream.getAudioTracks()
  if (audioTracks.length === 0) {
    console.warn('No audio tracks available in stream')
    return null
  }

  // Check if any audio track is enabled
  const hasEnabledAudioTrack = audioTracks.some(track => track.enabled && track.readyState === 'live')
  if (!hasEnabledAudioTrack) {
    console.warn('No enabled audio tracks available')
    return null
  }

  // Check if MediaRecorder is supported
  if (typeof MediaRecorder === 'undefined') {
    console.warn('MediaRecorder API not supported')
    return null
  }

  if (!MediaRecorder.isTypeSupported('audio/webm') && !MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
    console.warn('Audio MediaRecorder not supported, returning null')
    return null
  }

  return new Promise((resolve) => {
    let mimeType = 'audio/webm'
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/webm;codecs=opus'
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'audio/ogg;codecs=opus'
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      console.warn('No supported audio MIME type found')
      resolve(null)
      return
    }

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
      })

      const chunks: Blob[] = []
      let hasError = false
      let stopTimeout: NodeJS.Timeout | null = null

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data)
        }
      }

      mediaRecorder.onstop = () => {
        if (stopTimeout) clearTimeout(stopTimeout)
        if (!hasError) {
          const blob = chunks.length > 0 ? new Blob(chunks, { type: mimeType }) : null
          resolve(blob)
        } else {
          resolve(null)
        }
      }

      // Handle errors
      mediaRecorder.onerror = (event) => {
        if (stopTimeout) clearTimeout(stopTimeout)
        hasError = true
        console.warn('MediaRecorder error:', event)
        try {
          if (mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop()
          }
        } catch (err) {
          // Ignore stop errors
        }
        resolve(null) // Return null instead of rejecting
      }

      // Start recording with timeslice to ensure data is available
      try {
        // Use timeslice to get data chunks periodically
        mediaRecorder.start(100) // Request data every 100ms
        
        // Stop after duration
        stopTimeout = setTimeout(() => {
          try {
            if (mediaRecorder.state === 'recording' || mediaRecorder.state === 'paused') {
              mediaRecorder.stop()
            } else if (mediaRecorder.state === 'inactive') {
              // Already stopped, resolve with what we have
              const blob = chunks.length > 0 ? new Blob(chunks, { type: mimeType }) : null
              resolve(blob)
            }
          } catch (err) {
            console.warn('Error stopping MediaRecorder:', err)
            resolve(null)
          }
        }, durationMs)
      } catch (err) {
        console.warn('Failed to start MediaRecorder:', err)
        if (stopTimeout) clearTimeout(stopTimeout)
        hasError = true
        resolve(null)
        return
      }
    } catch (err) {
      console.warn('Failed to create MediaRecorder:', err)
      resolve(null) // Return null instead of rejecting
    }
  })
}

