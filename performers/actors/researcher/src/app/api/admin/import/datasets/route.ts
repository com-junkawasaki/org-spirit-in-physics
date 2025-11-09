// Merkle DAG: admin_import_datasets_api -> dataset_listing_service
// API route to list available datasets for import

import { NextRequest, NextResponse } from 'next/server'
import { promises as fs } from 'fs'
import path from 'path'

interface DatasetInfo {
  participantId: string
  path: string
  files: {
    sessionData: boolean
    consent: boolean
    physiological: string[]
    humeArtifacts: string[]
  }
  lastModified: string
}

export async function GET(request: NextRequest) {
  try {
    // In Docker container, public directory is at /app/public
    // In local dev, it's at process.cwd()/public
    const isDocker = process.env.DOCKER_ENV === 'true' || process.cwd().startsWith('/app')
    const basePath = isDocker ? '/app' : process.cwd()
    const datasetBasePath = path.join(basePath, 'public', 'dataset', 'participants')
    
    // Check if directory exists
    try {
      await fs.access(datasetBasePath)
    } catch {
      return NextResponse.json(
        { datasets: [], error: 'Dataset directory not found' },
        { status: 404 }
      )
    }

    // Read all participant directories
    const entries = await fs.readdir(datasetBasePath, { withFileTypes: true })
    const datasets: DatasetInfo[] = []

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const participantId = entry.name
        const participantPath = path.join(datasetBasePath, participantId)
        
        try {
          const files = await fs.readdir(participantPath)
          const stats = await fs.stat(participantPath)
          
          // Check for required files
          const sessionData = files.includes('session_data.json')
          const consent = files.includes('consent.json')
          
          // Find physiological CSV files
          const physiological = files.filter(f => 
            f.endsWith('.CSV') || f.endsWith('.csv')
          )
          
          // Find HumeAI artifacts directories
          const humeArtifacts = files.filter(f => 
            f.startsWith('HumeAI_artifacts_')
          )

          datasets.push({
            participantId,
            path: participantPath,
            files: {
              sessionData,
              consent,
              physiological,
              humeArtifacts,
            },
            lastModified: stats.mtime.toISOString(),
          })
        } catch (error) {
          console.error(`Error reading dataset ${participantId}:`, error)
          // Continue with other datasets
        }
      }
    }

    // Sort by last modified (newest first)
    datasets.sort((a, b) => 
      new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
    )

    return NextResponse.json({ datasets })
  } catch (error) {
    console.error('Error listing datasets:', error)
    return NextResponse.json(
      { error: 'Failed to list datasets', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

