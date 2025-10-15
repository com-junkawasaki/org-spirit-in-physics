import { NextRequest, NextResponse } from 'next/server'
import { Neo4jManager } from '@/lib/neo4j'

// Merkle DAG: imports_start_api -> workflow_initiation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    const dbManager = new Neo4jManager()
    
    // セッションの存在確認
    const sessionQuery = `
      FOR session IN participant_experiment_sessions
      FILTER session._key == @sessionId
      RETURN {
        id: session._key,
        participantId: session.participant_id,
        status: session.status
      }
    `
    
    const sessionResult = await dbManager.query(sessionQuery, { sessionId })
    
    if (sessionResult.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    const session = sessionResult[0] as any

    // 既存のジョブがあるかチェック
    const existingJobQuery = `
      FOR job IN participant_hume_analysis_jobs
      FILTER job.session_id == @sessionId
      AND job.status IN ['PENDING', 'RUNNING']
      RETURN job._key
    `
    
    const existingJobs = await dbManager.query(existingJobQuery, { sessionId })
    
    if (existingJobs.length > 0) {
      return NextResponse.json(
        { error: 'Import job already exists for this session' },
        { status: 409 }
      )
    }

    // 新しいインポートジョブを作成
    const jobData = {
      session_id: sessionId,
      participant_id: session.participantId,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      progress_percentage: 0,
      error_message: null
    }

    const insertQuery = `
      INSERT @jobData INTO participant_hume_analysis_jobs
      RETURN NEW
    `
    
    const result = await dbManager.query(insertQuery, { jobData })
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create import job' },
        { status: 500 }
      )
    }

    const job = result[0] as any

    // セッションステータスを更新
    const updateSessionQuery = `
      UPDATE @sessionId WITH { 
        status: 'IMPORT_PENDING',
        updated_at: @updatedAt
      } IN participant_experiment_sessions
      RETURN NEW
    `
    
    await dbManager.query(updateSessionQuery, { 
      sessionId, 
      updatedAt: new Date().toISOString() 
    })

    // Start the import workflow via Serverless Workflow SDK
    try {
      const workflowResponse = await fetch('http://localhost:8000/api/workflows/start-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          participantId: session.participantId
        })
      })

      if (!workflowResponse.ok) {
        console.warn('Failed to start workflow, but job was created')
      }
    } catch (workflowError) {
      console.warn('Workflow start failed:', workflowError)
      // Don't fail the whole request if workflow is down
    }

    return NextResponse.json({
      success: true,
      job: {
        id: job._key,
        sessionId: job.session_id,
        participantId: job.participant_id,
        status: job.status,
        createdAt: job.created_at
      }
    })
  } catch (error) {
    console.error('Failed to start import:', error)
    return NextResponse.json(
      { error: 'Failed to start import' },
      { status: 500 }
    )
  }
}
