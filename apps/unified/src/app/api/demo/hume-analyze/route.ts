// Merkle DAG: api.hume_analyze
// Hume AI API proxy endpoint

import { NextRequest, NextResponse } from 'next/server';
import { match, P } from 'ts-pattern';

const HUME_API_BASE = 'https://api.hume.ai/v0';

// Helper to get environment variable (Next.js uses process.env)
function getEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env) {
    const value = process.env[key];
    if (value && typeof value === 'string' && value.length > 0) {
      return value;
    }
  }
  return undefined;
}

/**
 * Check job status and wait for completion
 */
async function waitForJobCompletion(jobId: string, apiKey: string, maxWaitTime: number = 60000): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 2000; // Poll every 2 seconds

  while (Date.now() - startTime < maxWaitTime) {
    const response = await fetch(`${HUME_API_BASE}/batch/jobs/${jobId}`, {
      method: 'GET',
      headers: {
        'X-Hume-Api-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to check job status: ${response.status} ${errorText}`);
    }

    const jobStatus = await response.json();
    console.log(`Job ${jobId} status: ${jobStatus.state}`);

    // Use ts-pattern to handle job status
    const result = await match(jobStatus.state)
      .with('COMPLETED', async () => {
        // Get predictions
        const predictionsResponse = await fetch(`${HUME_API_BASE}/batch/jobs/${jobId}/predictions`, {
          method: 'GET',
          headers: {
            'X-Hume-Api-Key': apiKey,
            'Accept': 'application/json',
          },
        });

        if (!predictionsResponse.ok) {
          const errorText = await predictionsResponse.text();
          throw new Error(`Failed to get predictions: ${predictionsResponse.status} ${errorText}`);
        }

        const predictionsData = await predictionsResponse.json();
        console.log(`[Job ${jobId}] Predictions received (full):`, JSON.stringify(predictionsData, null, 2));
        console.log(`[Job ${jobId}] Predictions structure:`, {
          type: typeof predictionsData,
          isArray: Array.isArray(predictionsData),
          keys: typeof predictionsData === 'object' && predictionsData !== null ? Object.keys(predictionsData) : [],
          hasResults: !!(predictionsData as any)?.results,
          resultsType: Array.isArray((predictionsData as any)?.results) ? 'array' : typeof (predictionsData as any)?.results,
          resultsLength: Array.isArray((predictionsData as any)?.results) ? (predictionsData as any).results.length : 0,
          // Deep structure check
          firstResultKeys: Array.isArray((predictionsData as any)?.results) && (predictionsData as any).results[0] 
            ? Object.keys((predictionsData as any).results[0]) 
            : [],
          firstResultHasResults: Array.isArray((predictionsData as any)?.results) && (predictionsData as any).results[0]
            ? !!(predictionsData as any).results[0].results
            : false,
        });
        return { completed: true, data: predictionsData } as const;
      })
      .with('FAILED', () => {
        const errorMessage = match(jobStatus.error)
          .with(P.string, (e) => e)
          .otherwise(() => 'Unknown error');
        console.error(`Job ${jobId} failed:`, errorMessage);
        throw new Error(`Job ${jobId} failed: ${errorMessage}`);
      })
      .otherwise(() => {
        // Continue polling for other states (PENDING, RUNNING, etc.)
        return { completed: false } as const;
      });
    
    if (result.completed) {
      return result.data;
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Job ${jobId} did not complete within ${maxWaitTime}ms`);
}

/**
 * Call Hume AI Batch API to analyze video and audio
 */
async function analyzeBatch(videoBlob: Blob, audioBlob: Blob | null, apiKey: string): Promise<any> {
  // Prepare models configuration
  const models: Record<string, any> = {
    face: {}, // Face expression analysis
  };

  // Add audio models if audio is available
  if (audioBlob && audioBlob.size > 0) {
    models.prosody = {}; // Speech prosody analysis
    models.burst = {}; // Vocal burst analysis
  }

  // Create multipart/form-data request
  const formData = new FormData();
  
  // Add models configuration as JSON string
  formData.append('json', JSON.stringify({ models }));
  
  // Add video file
  formData.append('file', videoBlob, 'video.webm');
  
  // Add audio file if available
  if (audioBlob && audioBlob.size > 0) {
    formData.append('file', audioBlob, 'audio.webm');
  }

  // Submit job
  const response = await fetch(`${HUME_API_BASE}/batch/jobs`, {
    method: 'POST',
    headers: {
      'X-Hume-Api-Key': apiKey,
      // Don't set Content-Type header - browser will set it with boundary
    },
    body: formData,
  });

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch (err) {
      errorText = 'Failed to read error response';
    }
    const errorDetails = {
      status: response.status,
      statusText: response.statusText,
      url: `${HUME_API_BASE}/batch/jobs`,
      headers: Object.fromEntries(response.headers.entries()),
      errorText: errorText.substring(0, 500),
      apiKeyPrefix: apiKey.substring(0, 10),
      apiKeyLength: apiKey.length,
    };
    console.error('Hume Batch API error:', JSON.stringify(errorDetails, null, 2));
    throw new Error(`Hume Batch API error: ${response.status} ${errorText || response.statusText}`);
  }

  const jobResponse = await response.json();
  const jobId = jobResponse.job_id;

  if (!jobId) {
    throw new Error('No job_id returned from Hume API');
  }

  console.log(`Hume Batch API job started: ${jobId}`);

  // Wait for job completion and get predictions
  const predictions = await waitForJobCompletion(jobId, apiKey);
  
  console.log('Hume Batch API predictions received:', JSON.stringify(predictions).substring(0, 500));
  return predictions;
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    const audioFile = formData.get('audio') as File | null;

    // Validate video file
    if (!videoFile || videoFile.size === 0) {
      return NextResponse.json(
        { error: 'Video file is required' },
        { status: 400 }
      );
    }

    // Get API key from environment (Next.js uses process.env)
    const apiKey = 
      process.env?.HUME_API_KEY ||
      process.env?.HUME_API ||
      getEnvVar('HUME_API_KEY') || 
      getEnvVar('HUME_API') ||
      null;

    // Enhanced logging for debugging
    const envCheck = {
      hasHumeApiKey_process: typeof process !== 'undefined' ? !!process.env?.HUME_API_KEY : false,
      hasHumeApi_process: typeof process !== 'undefined' ? !!process.env?.HUME_API : false,
      apiKeyLength: apiKey?.length || 0,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A',
      allEnvKeys_process: typeof process !== 'undefined' ? Object.keys(process.env).filter(k => k.includes('HUME')).join(', ') : 'N/A',
      selectedApiKey: apiKey ? 'Found' : 'Not found',
      processEnvSample: typeof process !== 'undefined' ? Object.keys(process.env).slice(0, 10).join(', ') : 'N/A',
      processEnvHumeApiKey: typeof process !== 'undefined' ? (process.env?.HUME_API_KEY ? `${process.env.HUME_API_KEY.substring(0, 10)}...` : 'undefined') : 'N/A',
      processEnvHumeApi: typeof process !== 'undefined' ? (process.env?.HUME_API ? `${process.env.HUME_API.substring(0, 10)}...` : 'undefined') : 'N/A',
    };
    console.log('Hume API key check:', JSON.stringify(envCheck, null, 2));
    
    // If no API key found, log detailed error
    if (!apiKey) {
      console.error('Hume API key not found. Environment check:', JSON.stringify(envCheck, null, 2));
      console.error('Available process.env keys:', typeof process !== 'undefined' ? Object.keys(process.env).slice(0, 20).join(', ') : 'N/A');
    }

    if (!apiKey) {
      console.error('Hume API key not found in environment variables');
      return NextResponse.json(
        { error: 'Hume API key not configured' },
        { status: 500 }
      );
    }

    // Convert File to Blob
    const videoBlob = await videoFile.arrayBuffer().then(buf => new Blob([buf], { type: videoFile.type }));
    const audioBlob = audioFile ? await audioFile.arrayBuffer().then(buf => new Blob([buf], { type: audioFile.type })) : null;

    // Validate video blob size
    if (!videoBlob || videoBlob.size === 0) {
      console.error('[API Route] Validation failed: Video blob is empty or invalid', {
        videoBlobSize: videoBlob?.size || 0,
        videoFileSize: videoFile.size,
        videoFileType: videoFile.type
      });
      return NextResponse.json({
        predictions: [],
        error: 'Video blob is empty or invalid',
        debug: {
          videoBlobSize: videoBlob?.size || 0,
          videoFileSize: videoFile.size,
          videoFileType: videoFile.type
        }
      });
    }

    console.log('[API Route] Validation passed:', {
      videoBlobSize: videoBlob.size,
      audioBlobSize: audioBlob?.size || 0,
      videoFileType: videoFile.type
    });

    // Call Hume AI Batch API
    let batchResult: any;
    try {
      batchResult = await analyzeBatch(videoBlob, audioBlob, apiKey);
      console.log('[API Route] Batch result received:', {
        type: typeof batchResult,
        isArray: Array.isArray(batchResult),
        keys: typeof batchResult === 'object' && batchResult !== null ? Object.keys(batchResult) : [],
        fullStructure: JSON.stringify(batchResult).substring(0, 5000)
      });
    } catch (err) {
      console.error('Hume Batch API call failed:', err);
      // Return empty predictions for graceful degradation
      return NextResponse.json({
        predictions: [],
        error: err instanceof Error ? err.message : 'Unknown error',
      });
    }

    // Process Batch API response format
    // Batch API can return different structures:
    // 1. { results: [{ source: {...}, results: [{ face: {...}, prosody: {...}, burst: {...} }] }] }
    // 2. Direct array of predictions: [{ face: {...}, prosody: {...}, burst: {...} }]
    // 3. Single object with models: { face: {...}, prosody: {...}, burst: {...} }
    console.log('[API Route] Stage 1: Batch API response structure analysis:', {
      type: typeof batchResult,
      isArray: Array.isArray(batchResult),
      isNull: batchResult === null,
      isUndefined: batchResult === undefined,
      keys: typeof batchResult === 'object' && batchResult !== null ? Object.keys(batchResult) : [],
      hasResults: !!(batchResult as any)?.results,
      resultsType: Array.isArray((batchResult as any)?.results) ? 'array' : typeof (batchResult as any)?.results,
      resultsLength: Array.isArray((batchResult as any)?.results) ? (batchResult as any).results.length : 0,
      firstResultKeys: Array.isArray((batchResult as any)?.results) && (batchResult as any).results[0] 
        ? Object.keys((batchResult as any).results[0])
        : [],
      firstResultSample: Array.isArray((batchResult as any)?.results) && (batchResult as any).results[0] 
        ? JSON.stringify((batchResult as any).results[0]).substring(0, 2000) 
        : 'none',
      fullResponseSample: JSON.stringify(batchResult).substring(0, 5000)
    });
    
    const predictions: any[] = [];

    // Handle case 1: { results: [...] }
    if ((batchResult as any).results && Array.isArray((batchResult as any).results)) {
      console.log(`[API Route] Stage 2: Processing case 1 - results array with ${(batchResult as any).results.length} file results`);
      for (let fileIdx = 0; fileIdx < (batchResult as any).results.length; fileIdx++) {
        const fileResult = (batchResult as any).results[fileIdx];
        console.log(`[API Route] Stage 2.${fileIdx}: File result structure:`, {
          fileResultKeys: Object.keys(fileResult),
          hasSource: !!fileResult.source,
          hasResults: !!fileResult.results,
          resultsIsArray: Array.isArray(fileResult.results),
          resultsLength: fileResult.results?.length || 0,
          resultsKeys: fileResult.results?.[0] ? Object.keys(fileResult.results[0]) : [],
          firstResultSample: fileResult.results?.[0] ? JSON.stringify(fileResult.results[0]).substring(0, 1000) : 'none',
          fullFileResult: JSON.stringify(fileResult).substring(0, 3000)
        });
        
        // Each fileResult has a results array containing model predictions
        if (fileResult.results && Array.isArray(fileResult.results)) {
          // Aggregate all model predictions from all results
          const aggregatedModels: Record<string, any> = {
            face: { predictions: [] },
            prosody: { predictions: [] },
            burst: { predictions: [] },
          };

          for (let modelIdx = 0; modelIdx < fileResult.results.length; modelIdx++) {
            const modelResult = fileResult.results[modelIdx];
            console.log(`[API Route] Stage 2.${fileIdx}.${modelIdx}: Model result structure:`, {
              keys: Object.keys(modelResult),
              hasFace: !!modelResult.face,
              hasProsody: !!modelResult.prosody,
              hasBurst: !!modelResult.burst,
              faceStructure: modelResult.face ? {
                hasPredictions: !!modelResult.face.predictions,
                predictionsIsArray: Array.isArray(modelResult.face.predictions),
                predictionsLength: modelResult.face.predictions?.length || 0,
                firstPredictionSample: modelResult.face.predictions?.[0] ? JSON.stringify(modelResult.face.predictions[0]).substring(0, 500) : 'none'
              } : null,
              prosodyStructure: modelResult.prosody ? {
                hasPredictions: !!modelResult.prosody.predictions,
                predictionsIsArray: Array.isArray(modelResult.prosody.predictions),
                predictionsLength: modelResult.prosody.predictions?.length || 0
              } : null,
              burstStructure: modelResult.burst ? {
                hasPredictions: !!modelResult.burst.predictions,
                predictionsIsArray: Array.isArray(modelResult.burst.predictions),
                predictionsLength: modelResult.burst.predictions?.length || 0
              } : null,
              fullModelResult: JSON.stringify(modelResult).substring(0, 2000)
            });
            
            // Extract predictions by model type
            if (modelResult.face && modelResult.face.predictions) {
              console.log(`Adding ${modelResult.face.predictions.length} face predictions`);
              aggregatedModels.face.predictions.push(...modelResult.face.predictions);
            }
            if (modelResult.prosody && modelResult.prosody.predictions) {
              console.log(`Adding ${modelResult.prosody.predictions.length} prosody predictions`);
              aggregatedModels.prosody.predictions.push(...modelResult.prosody.predictions);
            }
            if (modelResult.burst && modelResult.burst.predictions) {
              console.log(`Adding ${modelResult.burst.predictions.length} burst predictions`);
              aggregatedModels.burst.predictions.push(...modelResult.burst.predictions);
            }
          }

          console.log(`[API Route] Stage 2.${fileIdx}: Aggregated models summary:`, {
            face: aggregatedModels.face.predictions.length,
            prosody: aggregatedModels.prosody.predictions.length,
            burst: aggregatedModels.burst.predictions.length,
            totalPredictions: aggregatedModels.face.predictions.length + aggregatedModels.prosody.predictions.length + aggregatedModels.burst.predictions.length
          });

          // Add non-empty model predictions to predictions array
          if (aggregatedModels.face.predictions.length > 0) {
            predictions.push({ face: aggregatedModels.face });
            console.log(`Added face predictions to array`);
          }
          if (aggregatedModels.prosody.predictions.length > 0) {
            predictions.push({ prosody: aggregatedModels.prosody });
            console.log(`Added prosody predictions to array`);
          }
          if (aggregatedModels.burst.predictions.length > 0) {
            predictions.push({ burst: aggregatedModels.burst });
            console.log(`Added burst predictions to array`);
          }
        } else {
          console.warn(`File result ${fileIdx} has no results array`);
        }
      }
    } 
    // Handle case 2: Direct array of predictions
    else if (Array.isArray(batchResult)) {
      console.log('[API Route] Stage 2: Processing case 2 - direct array of predictions, length:', batchResult.length);
      for (const prediction of batchResult) {
        if (prediction && typeof prediction === 'object') {
          const hasFace = !!(prediction as any).face;
          const hasProsody = !!(prediction as any).prosody;
          const hasBurst = !!(prediction as any).burst;
          
          if (hasFace || hasProsody || hasBurst) {
            predictions.push(prediction);
            console.log(`Added prediction from array: face=${hasFace}, prosody=${hasProsody}, burst=${hasBurst}`);
          }
        }
      }
    }
    // Handle case 3: Single object with models
    else if (batchResult && typeof batchResult === 'object' && !Array.isArray(batchResult)) {
      console.log('[API Route] Stage 2: Processing case 3 - single object with model keys:', Object.keys(batchResult));
      const hasFace = !!(batchResult as any).face;
      const hasProsody = !!(batchResult as any).prosody;
      const hasBurst = !!(batchResult as any).burst;
      
      if (hasFace || hasProsody || hasBurst) {
        predictions.push(batchResult);
        console.log(`Added single object prediction: face=${hasFace}, prosody=${hasProsody}, burst=${hasBurst}`);
      } else {
        console.warn('Batch API response has no recognized structure, checking alternative structure:', {
          keys: Object.keys(batchResult),
          sample: JSON.stringify(batchResult).substring(0, 1000)
        });
      }
    }
    else {
      console.warn('Batch API response has unrecognized structure:', {
        type: typeof batchResult,
        isArray: Array.isArray(batchResult),
        keys: batchResult && typeof batchResult === 'object' ? Object.keys(batchResult) : [],
        sample: JSON.stringify(batchResult).substring(0, 1000)
      });
    }
    
    console.log(`[API Route] Stage 3: Final predictions array length: ${predictions.length}`);
    
    // Log detailed structure for debugging
    if (predictions.length === 0) {
      console.warn('[API Route] Stage 3: No predictions found in Batch API response, checking alternative structures...');
      console.log('[API Route] Stage 3: Full batchResult structure for debugging:', {
        type: typeof batchResult,
        isArray: Array.isArray(batchResult),
        isNull: batchResult === null,
        isUndefined: batchResult === undefined,
        keys: typeof batchResult === 'object' && batchResult !== null ? Object.keys(batchResult) : [],
        fullSample: JSON.stringify(batchResult, null, 2).substring(0, 10000)
      });
      
      // Try to extract face predictions directly from batchResult
      // Sometimes Batch API returns predictions in a different structure
      console.log('[API Route] Stage 3: Attempting alternative extraction methods...');
      
      // Method 1: Check if batchResult itself contains face/prosody/burst data
      if (batchResult && typeof batchResult === 'object' && !Array.isArray(batchResult)) {
        const batchObj = batchResult as any;
        
        // Check for direct model keys
        if (batchObj.face) {
          console.log('[API Route] Stage 3: Method 1a - Found face data directly in batchResult');
          predictions.push({ face: batchObj.face });
        }
        if (batchObj.prosody) {
          console.log('[API Route] Stage 3: Method 1b - Found prosody data directly in batchResult');
          predictions.push({ prosody: batchObj.prosody });
        }
        if (batchObj.burst) {
          console.log('[API Route] Stage 3: Method 1c - Found burst data directly in batchResult');
          predictions.push({ burst: batchObj.burst });
        }
        
        // Method 2: Check nested structures
        // Check if batchResult has a nested structure like { data: { face: {...} } }
        if (batchObj.data) {
          console.log('[API Route] Stage 3: Method 2a - Found data property, checking nested structure');
          if (batchObj.data.face) {
            console.log('[API Route] Stage 3: Method 2a - Found face in data.face');
            predictions.push({ face: batchObj.data.face });
          }
          if (batchObj.data.prosody) {
            console.log('[API Route] Stage 3: Method 2a - Found prosody in data.prosody');
            predictions.push({ prosody: batchObj.data.prosody });
          }
          if (batchObj.data.burst) {
            console.log('[API Route] Stage 3: Method 2a - Found burst in data.burst');
            predictions.push({ burst: batchObj.data.burst });
          }
        }
        
        // Method 3: Deep search for predictions arrays (limited depth to avoid infinite loops)
        const deepSearch = (obj: any, path: string = '', depth: number = 0): void => {
          if (!obj || typeof obj !== 'object' || depth > 4) return;
          
          // Check if this object has predictions array
          if (Array.isArray(obj.predictions) && obj.predictions.length > 0) {
            // Determine model type from context
            if (path.includes('face') || obj.name === 'face' || obj.type === 'face') {
              console.log(`[API Route] Stage 3: Method 3a - Found face predictions at path: ${path}`);
              predictions.push({ face: obj });
            } else if (path.includes('prosody') || obj.name === 'prosody' || obj.type === 'prosody') {
              console.log(`[API Route] Stage 3: Method 3b - Found prosody predictions at path: ${path}`);
              predictions.push({ prosody: obj });
            } else if (path.includes('burst') || obj.name === 'burst' || obj.type === 'burst') {
              console.log(`[API Route] Stage 3: Method 3c - Found burst predictions at path: ${path}`);
              predictions.push({ burst: obj });
            } else {
              // Default to face if we can't determine
              console.log(`[API Route] Stage 3: Method 3d - Found predictions array at path: ${path}, defaulting to face`);
              predictions.push({ face: obj });
            }
          }
          
          // Recursively search nested objects
          for (const key in obj) {
            if (obj.hasOwnProperty(key) && typeof obj[key] === 'object') {
              deepSearch(obj[key], path ? `${path}.${key}` : key, depth + 1);
            }
          }
        };
        
        console.log('[API Route] Stage 3: Method 3 - Performing deep search for predictions...');
        deepSearch(batchObj);
        
        // Method 4: Check if batchResult.results contains face data in various formats
        if (Array.isArray((batchResult as any).results)) {
          console.log('[API Route] Stage 3: Method 4 - Checking results array for nested structures');
          for (let i = 0; i < (batchResult as any).results.length; i++) {
            const result = (batchResult as any).results[i];
            if (result && typeof result === 'object') {
              // Check direct model keys
              if (result.face) {
                console.log(`[API Route] Stage 3: Method 4a - Found face in results[${i}]`);
                predictions.push({ face: result.face });
              }
              if (result.prosody) {
                console.log(`[API Route] Stage 3: Method 4b - Found prosody in results[${i}]`);
                predictions.push({ prosody: result.prosody });
              }
              if (result.burst) {
                console.log(`[API Route] Stage 3: Method 4c - Found burst in results[${i}]`);
                predictions.push({ burst: result.burst });
              }
              
              // Check nested results array
              if (Array.isArray(result.results)) {
                for (const nestedResult of result.results) {
                  if (nestedResult.face) {
                    console.log(`[API Route] Stage 3: Method 4d - Found face in results[${i}].results`);
                    predictions.push({ face: nestedResult.face });
                  }
                  if (nestedResult.prosody) {
                    console.log(`[API Route] Stage 3: Method 4e - Found prosody in results[${i}].results`);
                    predictions.push({ prosody: nestedResult.prosody });
                  }
                  if (nestedResult.burst) {
                    console.log(`[API Route] Stage 3: Method 4f - Found burst in results[${i}].results`);
                    predictions.push({ burst: nestedResult.burst });
                  }
                }
              }
            }
          }
        }
      }
      
      console.log(`[API Route] Stage 3: After alternative extraction, predictions array length: ${predictions.length}`);
    }

    // If still no predictions, return empty result but log detailed info
    if (predictions.length === 0) {
      console.error('[API Route] Stage 4: No predictions found after all extraction attempts');
      const errorResponse = {
        predictions: [],
        error: 'No predictions found in Batch API response',
        debug: {
          batchResultType: typeof batchResult,
          batchResultIsNull: batchResult === null,
          batchResultIsUndefined: batchResult === undefined,
          batchResultIsArray: Array.isArray(batchResult),
          batchResultKeys: typeof batchResult === 'object' && batchResult !== null ? Object.keys(batchResult) : [],
          batchResultSample: JSON.stringify(batchResult, null, 2).substring(0, 5000),
          extractionMethodsAttempted: [
            'Case 1: results array processing',
            'Case 2: Direct array processing',
            'Case 3: Single object processing',
            'Method 1: Direct model keys',
            'Method 2: Nested data structure',
            'Method 3: Deep search',
            'Method 4: Results array nested search'
          ],
          possibleCauses: [
            'Video blob may be empty or corrupted',
            'No faces detected in video',
            'Hume API returned unexpected response structure',
            'API job may have failed or timed out'
          ]
        }
      };
      console.error('[API Route] Stage 4: Error response:', JSON.stringify(errorResponse, null, 2));
      return NextResponse.json(errorResponse);
    }

    // Validate predictions structure
    const validatedPredictions = predictions.filter((pred: any) => {
      const hasValidStructure = 
        (pred.face && (pred.face.predictions || Array.isArray(pred.face))) ||
        (pred.prosody && (pred.prosody.predictions || Array.isArray(pred.prosody))) ||
        (pred.burst && (pred.burst.predictions || Array.isArray(pred.burst)));
      if (!hasValidStructure) {
        console.warn('[API Route] Stage 4: Invalid prediction structure filtered out:', pred);
      }
      return hasValidStructure;
    });

    if (validatedPredictions.length === 0) {
      console.error('[API Route] Stage 4: All predictions failed validation');
      return NextResponse.json({
        predictions: [],
        error: 'All predictions failed validation',
        debug: {
          originalPredictionsCount: predictions.length,
          validatedPredictionsCount: validatedPredictions.length
        }
      });
    }

    console.log(`[API Route] Stage 4: Returning ${validatedPredictions.length} validated predictions`);

    return NextResponse.json({
      predictions: validatedPredictions,
    });
  } catch (error) {
    console.error('Hume API error:', error);
    // Return empty predictions on error for graceful degradation
    return NextResponse.json({
      predictions: [],
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
