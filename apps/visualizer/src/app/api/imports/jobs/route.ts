import { NextRequest, NextResponse } from 'next/server'
import { ArangoDBManager } from '@/lib/neo4j'

// Merkle DAG: imports_jobs_api -> job_listing_and_management
export async function GET(request: NextRequest) {
  try {
    const dbManager = new ArangoDBManager()
    
    // インポートジョブの一覧を取得
    const jobsQuery = `
      FOR job IN participant_hume_analysis_jobs
      SORT job.created_at DESC
      LIMIT 50
      RETURN {
        id: job._key,
        sessionId: job.session_id,
        participantId: job.participant_id,
        status: job.status,
        createdAt: job.created_at,
        completedAt: job.completed_at,
        error: job.error_message,
        progress: job.progress_percentage
      }
    `
    
    const jobs = await dbManager.query(jobsQuery)
    
    return NextResponse.json(jobs)
  } catch (error) {
    console.error('Failed to get import jobs:', error)
    return NextResponse.json(
      { error: 'Failed to get import jobs' },
      { status: 500 }
    )
  }
}

// Merkle DAG: imports_jobs_api -> job_creation
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

    const dbManager = new ArangoDBManager()
    
    // 新しいインポートジョブを作成
    const jobData: any = {
      session_id: sessionId,
      status: 'PENDING',
      created_at: new Date().toISOString(),
      progress_percentage: 0
    }

    // セッション情報を取得してparticipant_idを設定
    const sessionQuery = `
      FOR session IN participant_experiment_sessions
      FILTER session._key == @sessionId
      RETURN session.participant_id
    `
    
    const sessionResult = await dbManager.query(sessionQuery, { sessionId })
    
    if (sessionResult.length === 0) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    jobData.participant_id = sessionResult[0]

    // ジョブをデータベースに保存
    const insertQuery = `
      INSERT @jobData INTO participant_hume_analysis_jobs
      RETURN NEW
    `
    
    const result = await dbManager.query(insertQuery, { jobData })
    
    if (result.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create job' },
        { status: 500 }
      )
    }

    // 実際のインポート処理を開始（非同期）
    // ここでServerlessワークフローを開始する
    // startImportWorkflow(sessionId)

    return NextResponse.json({
      success: true,
      job: result[0]
    })
  } catch (error) {
    console.error('Failed to create import job:', error)
    return NextResponse.json(
      { error: 'Failed to create import job' },
      { status: 500 }
    )
  }
}
