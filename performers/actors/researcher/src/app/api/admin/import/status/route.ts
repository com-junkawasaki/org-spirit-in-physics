// Merkle DAG: admin_import_status_api -> import_status_tracking_service
// API route to get import status (check Docker logs or database)

import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const participantId = searchParams.get('participantId')

    if (!participantId) {
      return NextResponse.json(
        { error: 'participantId is required' },
        { status: 400 }
      )
    }

    // Check Docker container logs for importer service
    // This is a simplified implementation - in production, you might want to
    // track import status in a database or use a job queue system
    
    try {
      // Check logs for this participant using docker logs
      // Note: This checks all containers with "importer" in the name
      const logCommand = `docker ps -a --filter "name=importer" --format "{{.ID}}" | xargs -I {} docker logs {} --tail 100 2>&1 | grep -i "${participantId}" | tail -5`
      let logOutput = ''
      try {
        const { stdout: logs } = await execAsync(logCommand)
        logOutput = logs
      } catch {
        // No logs found for this participant
      }

      // Determine status based on logs
      let status: 'pending' | 'in_progress' | 'completed' | 'failed' = 'pending'
      if (logOutput.includes('Import completed successfully')) {
        status = 'completed'
      } else if (logOutput.includes('Import failed') || logOutput.includes('Error')) {
        status = 'failed'
      } else if (logOutput.includes('Starting import') || logOutput.includes('Processing')) {
        status = 'in_progress'
      }

      return NextResponse.json({
        participantId,
        status,
        logs: logOutput.split('\n').filter(Boolean),
        lastChecked: new Date().toISOString(),
      })
    } catch (error) {
      // If Docker command fails, return unknown status
      return NextResponse.json({
        participantId,
        status: 'unknown',
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      })
    }
  } catch (error) {
    console.error('[Import Status API] Error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to get import status', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

