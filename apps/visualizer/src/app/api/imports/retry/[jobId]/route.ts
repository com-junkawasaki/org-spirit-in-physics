import { NextRequest, NextResponse } from 'next/server'
import { Neo4jManager } from '@/lib/neo4j'

// Merkle DAG: imports_retry_api -> failed_job_recovery
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  try {
    const { jobId } = await params

    if (!jobId) {
      return NextResponse.json(
        { error: 'jobId is required' },
        { status: 400 }
      )
    }

    const dbManager = new Neo4jManager()
    
    // ジョブの存在確認と詳細取得
    const jobQuery = `
      FOR job IN participant_hume_analysis_jobs
      FILTER job._key == @jobId
      RETURN {
        id: job._key,
        sessionId: job.session_id,
        participantId: job.participant_id,
        status: job.status,
        errorMessage: job.error_message
      }
    `
    
    const jobResult = await dbManager.query(jobQuery, { jobId })
    
    if (jobResult.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      )
    }

    const job = jobResult[0] as any

    // ジョブが失敗状態でない場合はエラー
    if (job.status !== 'FAILED') {
      return NextResponse.json(
        { error: 'Job is not in failed state' },
        { status: 400 }
      )
    }

    // ジョブをリセットして再実行
    const resetJobQuery = `
      UPDATE @jobId WITH {
        status: 'PENDING',
        progress_percentage: 0,
        error_message: null,
        retry_count: (job.retry_count || 0) + 1,
        updated_at: @updatedAt
      } IN participant_hume_analysis_jobs
      RETURN NEW
    `
    
    const resetResult = await dbManager.query(resetJobQuery, { 
      jobId, 
      updatedAt: new Date().toISOString() 
    })
    
    if (resetResult.length === 0) {
      return NextResponse.json(
        { error: 'Failed to reset job' },
        { status: 500 }
      )
    }

    const resetJob = resetResult[0] as any

    // セッションステータスも更新
    const updateSessionQuery = `
      UPDATE @sessionId WITH { 
        status: 'IMPORT_PENDING',
        updated_at: @updatedAt
      } IN participant_experiment_sessions
      RETURN NEW
    `
    
    await dbManager.query(updateSessionQuery, { 
      sessionId: job.sessionId, 
      updatedAt: new Date().toISOString() 
    })

    // 実際のインポート処理を再開始
    // ここでServerlessワークフローを再開始する
    // await startImportWorkflow(job.sessionId)

    return NextResponse.json({
      success: true,
      job: {
        id: resetJob._key,
        sessionId: resetJob.session_id,
        participantId: resetJob.participant_id,
        status: resetJob.status,
        retryCount: resetJob.retry_count
      }
    })
  } catch (error) {
    console.error('Failed to retry job:', error)
    return NextResponse.json(
      { error: 'Failed to retry job' },
      { status: 500 }
    )
  }
}
