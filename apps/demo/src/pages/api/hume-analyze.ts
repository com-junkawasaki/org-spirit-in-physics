// Merkle DAG: api.hume_analyze
// Hume AI API proxy endpoint

import type { APIRoute } from 'astro'

const HUME_API_BASE = 'https://api.hume.ai/v0'

// Helper to get environment variable (works in both Astro and Node.js)
// In Astro, server-side API routes can access both import.meta.env and process.env
// However, import.meta.env is the recommended way for Astro
function getEnvVar(key: string): string | undefined {
  // Try import.meta.env first (Astro's recommended way, works in server-side API routes)
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    const value = (import.meta.env as any)[key]
    if (value && typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  // Fallback to process.env (Node.js runtime)
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key]
    if (value && typeof value === 'string' && value.length > 0) {
      return value
    }
  }
  return undefined
}

/**
 * Check job status and wait for completion
 */
async function waitForJobCompletion(jobId: string, apiKey: string, maxWaitTime: number = 60000): Promise<any> {
  const startTime = Date.now()
  const pollInterval = 2000 // Poll every 2 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(`${HUME_API_BASE}/batch/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Failed to check job status: ${response.status} ${errorText}`)
    }

    const jobStatus = await response.json()
    console.log(`Job ${jobId} status: ${jobStatus.state}`)

    if (jobStatus.state === 'COMPLETED') {
      // Get predictions
      const predictionsResponse = await fetch(`${HUME_API_BASE}/batch/jobs/${jobId}/predictions`, {
        method: 'GET',
        headers: {
          'X-Hume-Api-Key': apiKey,
          'Accept': 'application/json',
        },
      })

      if (!predictionsResponse.ok) {
        const errorText = await predictionsResponse.text()
        throw new Error(`Failed to get predictions: ${predictionsResponse.status} ${errorText}`)
      }

      return await predictionsResponse.json()
    }

    if (jobStatus.state === 'FAILED') {
      throw new Error(`Job ${jobId} failed: ${jobStatus.error || 'Unknown error'}`)
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval))
  }

  throw new Error(`Job ${jobId} did not complete within ${maxWaitTime}ms`)
}

/**
 * Call Hume AI Batch API to analyze video and audio
 */
async function analyzeBatch(videoBlob: Blob, audioBlob: Blob | null, apiKey: string): Promise<any> {
  // Prepare models configuration
  const models: Record<string, any> = {
    face: {}, // Face expression analysis
  }

  // Add audio models if audio is available
  if (audioBlob && audioBlob.size > 0) {
    models.prosody = {} // Speech prosody analysis
    models.burst = {} // Vocal burst analysis
  }

  // Create multipart/form-data request
  const formData = new FormData()
  
  // Add models configuration as JSON string
  formData.append('json', JSON.stringify({ models }))
  
  // Add video file
  formData.append('file', videoBlob, 'video.webm')
  
  // Add audio file if available
  if (audioBlob && audioBlob.size > 0) {
    formData.append('file', audioBlob, 'audio.webm')
  }

  // Submit job
  const response = await fetch(`${HUME_API_BASE}/batch/jobs`, {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': apiKey,
      // Don't set Content-Type header - browser will set it with boundary
    },
    body: formData,
  })

  if (!response.ok) {
    let errorText = ''
    try {
      errorText = await response.text()
    } catch (err) {
      errorText = 'Failed to read error response'
    }
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      url: `${HUME_API_BASE}/batch/jobs`,
      headers: Object.fromEntries(response.headers.entries()),
      errorText: errorText.substring(0, 500),
      apiKeyPrefix: apiKey.substring(0, 10),
      apiKeyLength: apiKey.length,
    }
    console.error('Hume Batch API error:', JSON.stringify(errorDetails, null, 2))
    throw new Error(`Hume Batch API error: ${response.status} ${errorText || response.statusText}`)
  }

  const jobResponse = await response.json()
  const jobId = jobResponse.job_id

  if (!jobId) {
    throw new Error('No job_id returned from Hume API')
  }

  console.log(`Hume Batch API job started: ${jobId}`)

  // Wait for job completion and get predictions
  const predictions = await waitForJobCompletion(jobId, apiKey)
  
  console.log('Hume Batch API predictions received:', JSON.stringify(predictions).substring(0, 500))
  return predictions
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
    // In Astro SSR mode, process.env is available at runtime in server-side API routes
    // Try multiple methods to get the API key
    const apiKey = 
      (typeof process !== 'undefined' && process.env?.HUME_API_KEY) ||
      (typeof process !== 'undefined' && process.env?.HUME_API) ||
      getEnvVar('HUME_API_KEY') || 
      getEnvVar('HUME_API') ||
      (typeof import.meta !== 'undefined' ? (import.meta.env as any)?.HUME_API_KEY : undefined) ||
      (typeof import.meta !== 'undefined' ? (import.meta.env as any)?.HUME_API : undefined) ||
      null

    // Enhanced logging for debugging
    const envCheck = {
      hasHumeApiKey_import: !!(typeof import.meta !== 'undefined' && (import.meta.env as any)?.HUME_API_KEY),
      hasHumeApi_import: !!(typeof import.meta !== 'undefined' && (import.meta.env as any)?.HUME_API),
      hasHumeApiKey_process: typeof process !== 'undefined' ? !!process.env?.HUME_API_KEY : false,
      hasHumeApi_process: typeof process !== 'undefined' ? !!process.env?.HUME_API : false,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A',
      allEnvKeys_process: typeof process !== 'undefined' ? Object.keys(process.env).filter(k => k.includes('HUME')).join(', ') : 'N/A',
      allEnvKeys_import: typeof import.meta !== 'undefined' ? Object.keys((import.meta.env as any) || {}).filter((k: string) => k.includes('HUME')).join(', ') : 'N/A',
      selectedApiKey: apiKey ? 'Found' : 'Not found',
      processEnvSample: typeof process !== 'undefined' ? Object.keys(process.env).slice(0, 10).join(', ') : 'N/A',
      processEnvHumeApiKey: typeof process !== 'undefined' ? (process.env?.HUME_API_KEY ? `${process.env.HUME_API_KEY.substring(0, 10)}...` : 'undefined') : 'N/A',
      processEnvHumeApi: typeof process !== 'undefined' ? (process.env?.HUME_API ? `${process.env.HUME_API.substring(0, 10)}...` : 'undefined') : 'N/A',
    }
    console.log('Hume API key check:', JSON.stringify(envCheck, null, 2))
    
    // If no API key found, log detailed error
    if (!apiKey) {
      console.error('Hume API key not found. Environment check:', JSON.stringify(envCheck, null, 2))
      console.error('Available process.env keys:', typeof process !== 'undefined' ? Object.keys(process.env).slice(0, 20).join(', ') : 'N/A')
      console.error('Available import.meta.env keys:', typeof import.meta !== 'undefined' ? Object.keys((import.meta.env as any) || {}).slice(0, 20).join(', ') : 'N/A')
    }

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

    // Call Hume AI Batch API
    let batchResult: any
    try {
      batchResult = await analyzeBatch(videoBlob, audioBlob, apiKey)
    } catch (err) {
      console.error('Hume Batch API call failed:', err)
      // Return empty predictions for graceful degradation
      return new Response(
        JSON.stringify({
          predictions: [],
          error: err instanceof Error ? err.message : 'Unknown error',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Process Batch API response format
    // Batch API returns: { results: [{ source: {...}, results: [{ face: {...}, prosody: {...}, burst: {...} }] }] }
    // Each result in results array contains model-specific predictions
    const predictions: any[] = []

    if (batchResult.results && Array.isArray(batchResult.results)) {
      for (const fileResult of batchResult.results) {
        // Each fileResult has a results array containing model predictions
        if (fileResult.results && Array.isArray(fileResult.results)) {
          // Aggregate all model predictions from all results
          const aggregatedModels: Record<string, any> = {
            face: { predictions: [] },
            prosody: { predictions: [] },
            burst: { predictions: [] },
          }

          for (const modelResult of fileResult.results) {
            // Extract predictions by model type
            if (modelResult.face && modelResult.face.predictions) {
              aggregatedModels.face.predictions.push(...modelResult.face.predictions)
            }
            if (modelResult.prosody && modelResult.prosody.predictions) {
              aggregatedModels.prosody.predictions.push(...modelResult.prosody.predictions)
            }
            if (modelResult.burst && modelResult.burst.predictions) {
              aggregatedModels.burst.predictions.push(...modelResult.burst.predictions)
            }
          }

          // Add non-empty model predictions to predictions array
          if (aggregatedModels.face.predictions.length > 0) {
            predictions.push({ face: aggregatedModels.face })
          }
          if (aggregatedModels.prosody.predictions.length > 0) {
            predictions.push({ prosody: aggregatedModels.prosody })
          }
          if (aggregatedModels.burst.predictions.length > 0) {
            predictions.push({ burst: aggregatedModels.burst })
          }
        }
      }
    }

    // If no predictions were found, return empty result
    if (predictions.length === 0) {
      console.warn('No predictions found in Batch API response')
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

