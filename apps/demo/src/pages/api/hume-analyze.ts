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

      const predictionsData = await predictionsResponse.json()
      console.log(`Job ${jobId} predictions received:`, JSON.stringify(predictionsData).substring(0, 2000))
      console.log(`Job ${jobId} predictions structure:`, {
        type: typeof predictionsData,
        isArray: Array.isArray(predictionsData),
        keys: typeof predictionsData === 'object' && predictionsData !== null ? Object.keys(predictionsData) : [],
        hasResults: !!(predictionsData as any)?.results,
        resultsType: Array.isArray((predictionsData as any)?.results) ? 'array' : typeof (predictionsData as any)?.results,
        resultsLength: Array.isArray((predictionsData as any)?.results) ? (predictionsData as any).results.length : 0,
      })
      return predictionsData
    }

    if (jobStatus.state === 'FAILED') {
      console.error(`Job ${jobId} failed:`, jobStatus.error || 'Unknown error')
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
    // Batch API can return different structures:
    // 1. { results: [{ source: {...}, results: [{ face: {...}, prosody: {...}, burst: {...} }] }] }
    // 2. Direct array of predictions: [{ face: {...}, prosody: {...}, burst: {...} }]
    // 3. Single object with models: { face: {...}, prosody: {...}, burst: {...} }
    console.log('Batch API response structure:', {
      type: typeof batchResult,
      isArray: Array.isArray(batchResult),
      keys: typeof batchResult === 'object' && batchResult !== null ? Object.keys(batchResult) : [],
      hasResults: !!(batchResult as any)?.results,
      resultsType: Array.isArray((batchResult as any)?.results) ? 'array' : typeof (batchResult as any)?.results,
      resultsLength: Array.isArray((batchResult as any)?.results) ? (batchResult as any).results.length : 0,
      firstResultSample: Array.isArray((batchResult as any)?.results) && (batchResult as any).results[0] 
        ? JSON.stringify((batchResult as any).results[0]).substring(0, 1000) 
        : 'none',
      fullResponseSample: JSON.stringify(batchResult).substring(0, 2000)
    })
    
    const predictions: any[] = []

    // Handle case 1: { results: [...] }
    if ((batchResult as any).results && Array.isArray((batchResult as any).results)) {
      console.log(`Processing ${(batchResult as any).results.length} file results`)
      for (let fileIdx = 0; fileIdx < (batchResult as any).results.length; fileIdx++) {
        const fileResult = (batchResult as any).results[fileIdx]
        console.log(`File result ${fileIdx}:`, {
          hasResults: !!fileResult.results,
          resultsLength: fileResult.results?.length || 0,
          resultsKeys: fileResult.results?.[0] ? Object.keys(fileResult.results[0]) : [],
          firstResultSample: fileResult.results?.[0] ? JSON.stringify(fileResult.results[0]).substring(0, 500) : 'none'
        })
        
        // Each fileResult has a results array containing model predictions
        if (fileResult.results && Array.isArray(fileResult.results)) {
          // Aggregate all model predictions from all results
          const aggregatedModels: Record<string, any> = {
            face: { predictions: [] },
            prosody: { predictions: [] },
            burst: { predictions: [] },
          }

          for (let modelIdx = 0; modelIdx < fileResult.results.length; modelIdx++) {
            const modelResult = fileResult.results[modelIdx]
            console.log(`Model result ${modelIdx}:`, {
              keys: Object.keys(modelResult),
              hasFace: !!modelResult.face,
              hasProsody: !!modelResult.prosody,
              hasBurst: !!modelResult.burst,
              facePredictions: modelResult.face?.predictions?.length || 0,
              prosodyPredictions: modelResult.prosody?.predictions?.length || 0,
              burstPredictions: modelResult.burst?.predictions?.length || 0
            })
            
            // Extract predictions by model type
            if (modelResult.face && modelResult.face.predictions) {
              console.log(`Adding ${modelResult.face.predictions.length} face predictions`)
              aggregatedModels.face.predictions.push(...modelResult.face.predictions)
            }
            if (modelResult.prosody && modelResult.prosody.predictions) {
              console.log(`Adding ${modelResult.prosody.predictions.length} prosody predictions`)
              aggregatedModels.prosody.predictions.push(...modelResult.prosody.predictions)
            }
            if (modelResult.burst && modelResult.burst.predictions) {
              console.log(`Adding ${modelResult.burst.predictions.length} burst predictions`)
              aggregatedModels.burst.predictions.push(...modelResult.burst.predictions)
            }
          }

          console.log(`Aggregated models:`, {
            face: aggregatedModels.face.predictions.length,
            prosody: aggregatedModels.prosody.predictions.length,
            burst: aggregatedModels.burst.predictions.length
          })

          // Add non-empty model predictions to predictions array
          if (aggregatedModels.face.predictions.length > 0) {
            predictions.push({ face: aggregatedModels.face })
            console.log(`Added face predictions to array`)
          }
          if (aggregatedModels.prosody.predictions.length > 0) {
            predictions.push({ prosody: aggregatedModels.prosody })
            console.log(`Added prosody predictions to array`)
          }
          if (aggregatedModels.burst.predictions.length > 0) {
            predictions.push({ burst: aggregatedModels.burst })
            console.log(`Added burst predictions to array`)
          }
        } else {
          console.warn(`File result ${fileIdx} has no results array`)
        }
      }
    } 
    // Handle case 2: Direct array of predictions
    else if (Array.isArray(batchResult)) {
      console.log('Batch API response is direct array, processing as predictions')
      for (const prediction of batchResult) {
        if (prediction && typeof prediction === 'object') {
          const hasFace = !!(prediction as any).face
          const hasProsody = !!(prediction as any).prosody
          const hasBurst = !!(prediction as any).burst
          
          if (hasFace || hasProsody || hasBurst) {
            predictions.push(prediction)
            console.log(`Added prediction from array: face=${hasFace}, prosody=${hasProsody}, burst=${hasBurst}`)
          }
        }
      }
    }
    // Handle case 3: Single object with models
    else if (batchResult && typeof batchResult === 'object' && !Array.isArray(batchResult)) {
      console.log('Batch API response is single object, checking for model keys')
      const hasFace = !!(batchResult as any).face
      const hasProsody = !!(batchResult as any).prosody
      const hasBurst = !!(batchResult as any).burst
      
      if (hasFace || hasProsody || hasBurst) {
        predictions.push(batchResult)
        console.log(`Added single object prediction: face=${hasFace}, prosody=${hasProsody}, burst=${hasBurst}`)
      } else {
        console.warn('Batch API response has no recognized structure, checking alternative structure:', {
          keys: Object.keys(batchResult),
          sample: JSON.stringify(batchResult).substring(0, 1000)
        })
      }
    }
    else {
      console.warn('Batch API response has unrecognized structure:', {
        type: typeof batchResult,
        isArray: Array.isArray(batchResult),
        keys: batchResult && typeof batchResult === 'object' ? Object.keys(batchResult) : [],
        sample: JSON.stringify(batchResult).substring(0, 1000)
      })
    }
    
    console.log(`Final predictions array length: ${predictions.length}`)
    
    // Log detailed structure for debugging
    if (predictions.length === 0) {
      console.warn('No predictions found in Batch API response, checking alternative structures...')
      console.log('Full batchResult structure:', {
        type: typeof batchResult,
        isArray: Array.isArray(batchResult),
        keys: typeof batchResult === 'object' && batchResult !== null ? Object.keys(batchResult) : [],
        fullSample: JSON.stringify(batchResult).substring(0, 3000)
      })
      
      // Try to extract face predictions directly from batchResult
      // Sometimes Batch API returns predictions in a different structure
      if (batchResult && typeof batchResult === 'object' && !Array.isArray(batchResult)) {
        // Check if batchResult itself contains face data
        if ((batchResult as any).face) {
          console.log('Found face data directly in batchResult')
          predictions.push({ face: (batchResult as any).face })
        }
        // Check if batchResult.results contains face data
        if (Array.isArray((batchResult as any).results)) {
          for (const result of (batchResult as any).results) {
            if (result.face) {
              console.log('Found face data in results array')
              predictions.push({ face: result.face })
            }
          }
        }
      }
      
      console.log(`After alternative extraction, predictions array length: ${predictions.length}`)
    }

    // If still no predictions, return empty result but log detailed info
    if (predictions.length === 0) {
      console.error('No predictions found after all extraction attempts')
      return new Response(
        JSON.stringify({
          predictions: [],
          error: 'No predictions found in Batch API response',
          debug: {
            batchResultType: typeof batchResult,
            batchResultKeys: typeof batchResult === 'object' && batchResult !== null ? Object.keys(batchResult) : [],
            batchResultSample: JSON.stringify(batchResult).substring(0, 1000)
          }
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

