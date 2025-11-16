// Merkle DAG: api.hume_analyze
// Hume AI API proxy endpoint

import type { APIRoute } from 'astro'

const HUME_API_BASE = 'https://api.hume.ai/v0'

// Helper to get environment variable (works in both Astro and Node.js)
function getEnvVar(key: string): string | undefined {
  // Try import.meta.env first (Astro)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = (import.meta.env as any)[key]
    if (value) return value
  }
  // Fallback to process.env (Node.js)
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  return undefined
}

/**
 * Call Hume AI Expression Measurement API (Face)
 */
async function analyzeFace(videoBlob: Blob, apiKey: string): Promise<any> {
  const formData = new FormData()
  formData.append('file', videoBlob, 'video.webm')

  const response = await fetch(`${HUME_API_BASE}/expression-measurement/models`, {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': apiKey,
      'Accept': 'application/json',
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Hume Face API error:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      errorText: errorText.substring(0, 500),
      apiKeyPrefix: apiKey.substring(0, 10),
    })
    throw new Error(`Hume Face API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log('Hume Face API response:', JSON.stringify(result).substring(0, 500))
  return result
}

/**
 * Call Hume AI Prosody API (Voice)
 */
async function analyzeProsody(audioBlob: Blob, apiKey: string): Promise<any> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')

  const response = await fetch(`${HUME_API_BASE}/prosody/models`, {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': apiKey,
      'Accept': 'application/json',
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Hume Prosody API error:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      errorText: errorText.substring(0, 500),
      apiKeyPrefix: apiKey.substring(0, 10),
    })
    throw new Error(`Hume Prosody API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log('Hume Prosody API response:', JSON.stringify(result).substring(0, 500))
  return result
}

/**
 * Call Hume AI Burst API (Short audio bursts)
 */
async function analyzeBurst(audioBlob: Blob, apiKey: string): Promise<any> {
  const formData = new FormData()
  formData.append('file', audioBlob, 'audio.webm')

  const response = await fetch(`${HUME_API_BASE}/burst/models`, {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': apiKey,
      'Accept': 'application/json',
    },
    body: formData,
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Hume Burst API error:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      errorText: errorText.substring(0, 500),
      apiKeyPrefix: apiKey.substring(0, 10),
    })
    throw new Error(`Hume Burst API error: ${response.status} ${errorText}`)
  }

  const result = await response.json()
  console.log('Hume Burst API response:', JSON.stringify(result).substring(0, 500))
  return result
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    const videoFile = formData.get('video') as File
    const audioFile = formData.get('audio') as File | null

    // Validate video file
    if (!videoFile || videoFile.size === 0) {
      return new Response(
        JSON.stringify({ error: 'Video file is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get API key from environment (hardcoded in docker-compose.yaml for development)
    const apiKey = getEnvVar('HUME_API_KEY') || getEnvVar('HUME_API') || null

    console.log('Hume API key check:', {
      hasHumeApiKey_import: !!(typeof import.meta !== 'undefined' && (import.meta.env as any)?.HUME_API_KEY),
      hasHumeApi_import: !!(typeof import.meta !== 'undefined' && (import.meta.env as any)?.HUME_API),
      hasHumeApiKey_process: typeof process !== 'undefined' ? !!process.env?.HUME_API_KEY : 'N/A',
      hasHumeApi_process: typeof process !== 'undefined' ? !!process.env?.HUME_API : 'N/A',
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A',
      allEnvKeys: typeof process !== 'undefined' ? Object.keys(process.env).filter(k => k.includes('HUME')).join(', ') : 'N/A',
      selectedApiKey: apiKey ? 'Found' : 'Not found',
    })

    if (!apiKey) {
      console.error('Hume API key not found in environment variables')
      return new Response(
        JSON.stringify({ error: 'Hume API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Convert File to Blob
    const videoBlob = await videoFile.arrayBuffer().then(buf => new Blob([buf], { type: videoFile.type }))
    const audioBlob = audioFile ? await audioFile.arrayBuffer().then(buf => new Blob([buf], { type: audioFile.type })) : null

    // Call Hume AI APIs in parallel
    const promises: Promise<any>[] = []

    // Always analyze face from video
    promises.push(
      analyzeFace(videoBlob, apiKey).catch(err => {
        console.warn('Face analysis failed:', err)
        return null
      })
    )

    // Analyze prosody if audio is available
    if (audioBlob && audioBlob.size > 0) {
      promises.push(
        analyzeProsody(audioBlob, apiKey).catch(err => {
          console.warn('Prosody analysis failed:', err)
          return null
        })
      )
      promises.push(
        analyzeBurst(audioBlob, apiKey).catch(err => {
          console.warn('Burst analysis failed:', err)
          return null
        })
      )
    }

    // Wait for all API calls to complete
    const results = await Promise.all(promises)
    const [faceResult, prosodyResult, burstResult] = results

    // Combine results into unified format
    // Hume AI API returns results in format: { results: [{ predictions: [...] }] }
    const predictions: any[] = []

    if (faceResult) {
      // Extract predictions from face result
      const facePredictions = faceResult.results?.[0]?.predictions || faceResult.predictions || []
      if (facePredictions.length > 0) {
        predictions.push({
          face: {
            predictions: facePredictions,
          },
        })
      }
    }

    if (prosodyResult) {
      // Extract predictions from prosody result
      const prosodyPredictions = prosodyResult.results?.[0]?.predictions || prosodyResult.predictions || []
      if (prosodyPredictions.length > 0) {
        predictions.push({
          prosody: {
            predictions: prosodyPredictions,
          },
        })
      }
    }

    if (burstResult) {
      // Extract predictions from burst result
      const burstPredictions = burstResult.results?.[0]?.predictions || burstResult.predictions || []
      if (burstPredictions.length > 0) {
        predictions.push({
          burst: {
            predictions: burstPredictions,
          },
        })
      }
    }

    // If no predictions were successful, return empty result
    if (predictions.length === 0) {
      console.warn('All Hume API calls failed, returning empty predictions')
      return new Response(
        JSON.stringify({
          predictions: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        predictions,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Hume API error:', error)
    // Return empty predictions on error for graceful degradation
    return new Response(
      JSON.stringify({
        predictions: [],
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

