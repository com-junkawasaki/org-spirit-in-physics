// Merkle DAG: lib.hume_realtime
// Real-time Hume AI emotion analysis integration

import { match } from 'ts-pattern'
import type { EmotionData } from '../../types/demo/demo'
import { normalizeEmotionName } from './emotion-normalization'

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

    // Log API response structure for debugging
    console.log('[Hume API] Response structure:', {
      hasPredictions: !!data.predictions,
      predictionsType: Array.isArray(data.predictions) ? 'array' : typeof data.predictions,
      predictionsLength: Array.isArray(data.predictions) ? data.predictions.length : 'N/A',
      hasError: !!data.error,
      error: data.error,
      allKeys: Object.keys(data),
      fullResponse: JSON.stringify(data).substring(0, 2000)
    })

    // Validate predictions before processing
    if (!data.predictions || !Array.isArray(data.predictions)) {
      console.warn('[Hume API] Invalid predictions structure:', {
        predictions: data.predictions,
        type: typeof data.predictions,
        isArray: Array.isArray(data.predictions),
        error: data.error,
        debug: data.debug
      })
    }

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

  console.log('Processing Hume predictions:', JSON.stringify(predictions).substring(0, 1000))
  console.log('Predictions array length:', predictions.length)
  console.log('Predictions structure:', {
    isArray: Array.isArray(predictions),
    firstItemType: predictions[0] ? typeof predictions[0] : 'none',
    firstItemKeys: predictions[0] && typeof predictions[0] === 'object' ? Object.keys(predictions[0]) : [],
  })
  
  if (predictions.length === 0) {
    console.warn('No predictions provided to processHumePredictions')
    return []
  }

  for (const prediction of predictions) {
    if (!prediction || typeof prediction !== 'object') {
      console.warn('Skipping invalid prediction:', prediction)
      continue
    }
    
    // Handle face predictions - support multiple formats
    // Format 1: { face: { predictions: [...] } }
    // Format 2: { face: { results: [{ predictions: [...] }] } }
    // Format 3: { results: [{ face: { predictions: [...] } }] }
    const faceData = prediction.face || (prediction.results?.[0] && prediction.results[0].face)
    if (faceData) {
      let facePredictions: any[] = []
      
      // Try different structures
      if (Array.isArray(faceData.predictions)) {
        facePredictions = faceData.predictions
      } else if (faceData.results?.[0]?.predictions) {
        facePredictions = faceData.results[0].predictions
      } else if (Array.isArray(faceData.results)) {
        // Flatten results array
        for (const result of faceData.results) {
          if (result.predictions && Array.isArray(result.predictions)) {
            facePredictions.push(...result.predictions)
          }
        }
      }
      
      console.log(`Processing ${facePredictions.length} face predictions`)
      if (facePredictions.length === 0) {
        console.warn('No face predictions found in faceData:', {
          hasPredictions: !!faceData.predictions,
          hasResults: !!faceData.results,
          keys: Object.keys(faceData),
          sample: JSON.stringify(faceData).substring(0, 500)
        })
      }
      for (const facePred of facePredictions) {
        if (facePred && facePred.emotions && Array.isArray(facePred.emotions)) {
          console.log(`Processing face prediction with ${facePred.emotions.length} emotions`)
          for (const emotion of facePred.emotions) {
            if (emotion && emotion.name && typeof emotion.score === 'number') {
              const normalized = normalizeEmotionName(emotion.name)
              if (normalized) {
                const key = `${normalized}_face`
                const current = emotionMap.get(key) || { score: 0, fileType: 'face' }
                emotionMap.set(key, {
                  score: Math.max(current.score, emotion.score || 0),
                  fileType: 'face',
                })
                console.log(`Added emotion: ${normalized}_face = ${emotion.score}`)
              }
            }
          }
        } else {
          console.warn('Face prediction structure:', {
            hasEmotions: !!facePred?.emotions,
            isArray: Array.isArray(facePred?.emotions),
            keys: facePred ? Object.keys(facePred) : [],
            sample: facePred ? JSON.stringify(facePred).substring(0, 200) : 'null'
          })
        }
      }
    } else {
      console.warn('No face data found in prediction:', {
        hasFace: !!prediction.face,
        hasResults: !!prediction.results,
        keys: Object.keys(prediction),
        sample: JSON.stringify(prediction).substring(0, 500)
      })
    }

    // Handle prosody predictions - support multiple formats
    const prosodyData = prediction.prosody || (prediction.results?.[0] && prediction.results[0].prosody)
    if (prosodyData) {
      let prosodyPredictions: any[] = []
      
      // Try different structures
      if (Array.isArray(prosodyData.predictions)) {
        prosodyPredictions = prosodyData.predictions
      } else if (prosodyData.results?.[0]?.predictions) {
        prosodyPredictions = prosodyData.results[0].predictions
      } else if (Array.isArray(prosodyData.results)) {
        // Flatten results array
        for (const result of prosodyData.results) {
          if (result.predictions && Array.isArray(result.predictions)) {
            prosodyPredictions.push(...result.predictions)
          }
        }
      }
      
      console.log(`Processing ${prosodyPredictions.length} prosody predictions`)
      for (const prosodyPred of prosodyPredictions) {
        if (prosodyPred && prosodyPred.emotions && Array.isArray(prosodyPred.emotions)) {
          for (const emotion of prosodyPred.emotions) {
            if (emotion && emotion.name && typeof emotion.score === 'number') {
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
    }

    // Handle burst predictions - support multiple formats
    const burstData = prediction.burst || (prediction.results?.[0] && prediction.results[0].burst)
    if (burstData) {
      let burstPredictions: any[] = []
      
      // Try different structures
      if (Array.isArray(burstData.predictions)) {
        burstPredictions = burstData.predictions
      } else if (burstData.results?.[0]?.predictions) {
        burstPredictions = burstData.results[0].predictions
      } else if (Array.isArray(burstData.results)) {
        // Flatten results array
        for (const result of burstData.results) {
          if (result.predictions && Array.isArray(result.predictions)) {
            burstPredictions.push(...result.predictions)
          }
        }
      }
      
      console.log(`Processing ${burstPredictions.length} burst predictions`)
      for (const burstPred of burstPredictions) {
        if (burstPred && burstPred.emotions && Array.isArray(burstPred.emotions)) {
          for (const emotion of burstPred.emotions) {
            if (emotion && emotion.name && typeof emotion.score === 'number') {
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
    const emotionNameParts = key.split('_');
    const emotionName = emotionNameParts[0];
    if (!emotionName) continue;
    const current = aggregatedEmotions.get(emotionName) || { score: 0, fileTypes: new Set<string>() }
    const fileType = value.fileType ?? 'language';
    aggregatedEmotions.set(emotionName, {
      score: Math.max(current.score, value.score),
      fileTypes: current.fileTypes.add(fileType),
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

  console.log('Processed emotions:', emotions.length > 0 
    ? emotions.map(e => `${e.name}:${e.score.toFixed(3)}`).join(', ')
    : 'NONE - emotionMap entries:', emotionMap.size)

  // Sort by score descending
  const sorted = emotions.sort((a, b) => b.score - a.score)
  console.log(`processHumePredictions returning ${sorted.length} emotions`)
  return sorted
}

/**
 * Capture frame from MediaStream as Blob
 */
export async function captureVideoFrame(stream: MediaStream, durationMs: number = 2000): Promise<Blob> {
  // Validate stream
  if (!stream || stream.getVideoTracks().length === 0) {
    console.warn('[captureVideoFrame] Invalid stream: no video tracks')
    return new Blob([], { type: 'video/webm' })
  }

  // Check if MediaRecorder is supported
  let mimeType = 'video/webm;codecs=vp9'
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm;codecs=vp8'
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    mimeType = 'video/webm'
  }
  if (!MediaRecorder.isTypeSupported(mimeType)) {
    console.warn('[captureVideoFrame] No supported video MIME type found, using empty blob')
    return new Blob([], { type: 'video/webm' })
  }

  return new Promise((resolve, _reject) => {
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
        console.log(`[captureVideoFrame] Recording stopped, blob size: ${blob.size} bytes, chunks: ${chunks.length}`)
        if (blob.size === 0) {
          console.warn('[captureVideoFrame] Warning: Captured blob is empty')
        }
        resolve(blob)
    }

    mediaRecorder.onerror = (error) => {
        console.warn('[captureVideoFrame] MediaRecorder error:', error)
        // Return empty blob instead of rejecting
        resolve(new Blob([], { type: mimeType }))
    }

    try {
      mediaRecorder.start()
      console.log(`[captureVideoFrame] MediaRecorder started, duration: ${durationMs}ms, mimeType: ${mimeType}`)
    } catch (err: any) {
      console.warn('[captureVideoFrame] MediaRecorder.start() error:', err)
      // Check if recording actually started despite error using ts-pattern
      const state = mediaRecorder.state as 'inactive' | 'recording' | 'paused'
      match(state)
        .with('recording', () => {
          console.warn('[captureVideoFrame] MediaRecorder started despite error, continuing...')
        })
        .otherwise(() => {
          console.error('[captureVideoFrame] MediaRecorder failed to start, returning empty blob')
          resolve(new Blob([], { type: mimeType }))
        })
    }

    setTimeout(() => {
        try {
          const state = mediaRecorder.state as 'inactive' | 'recording' | 'paused'
          match(state)
            .with('inactive', () => {
              // Already stopped, resolve with empty blob
              resolve(new Blob([], { type: mimeType }))
            })
            .otherwise(() => {
              mediaRecorder.stop()
            })
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
        // Check if MediaRecorder can actually start
        // Some browsers may throw errors even after creation
        if (mediaRecorder.state !== 'inactive') {
          console.warn('MediaRecorder is not in inactive state:', mediaRecorder.state)
          resolve(null)
          return
        }
        
        // Try to start recording
        // Some browsers don't support timeslice parameter, so try without it first
        try {
          // First try without timeslice (more compatible)
    mediaRecorder.start()
        } catch (startError) {
          // Check if it actually started despite the error
          // Some browsers may throw an error but still start recording
          const currentState = mediaRecorder.state as 'inactive' | 'recording' | 'paused'
          if (currentState === 'recording') {
            console.warn('MediaRecorder started despite error, continuing...')
            // Continue with recording - don't try again
          } else {
            // If that fails, try with timeslice (some browsers require it)
            console.warn('Failed to start without timeslice, trying with timeslice:', startError)
            try {
              mediaRecorder.start(100) // Request data every 100ms
            } catch (timesliceError) {
              console.warn('Failed to start MediaRecorder with timeslice:', timesliceError)
              // Check if it actually started despite the error
              const stateAfterRetry = mediaRecorder.state as 'inactive' | 'recording' | 'paused'
              if (stateAfterRetry === 'recording') {
                console.warn('MediaRecorder started despite error, continuing...')
                // Continue with recording
              } else {
                if (stopTimeout) clearTimeout(stopTimeout)
                hasError = true
                resolve(null)
                return
              }
            }
          }
        }
        
        // Check final state after start attempts
        const finalState = mediaRecorder.state as 'inactive' | 'recording' | 'paused'
        if (finalState === 'inactive') {
          // Unexpected state - recording didn't start
          console.warn('MediaRecorder in unexpected state:', finalState)
          if (stopTimeout) clearTimeout(stopTimeout)
          hasError = true
          resolve(null)
          return
        }
        
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

