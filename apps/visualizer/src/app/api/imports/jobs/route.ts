import { NextRequest, NextResponse } from 'next/server'
import { Neo4jManager } from '@/lib/neo4j'

// Merkle DAG: imports_jobs_api -> job_listing_and_management
export async function GET(request: NextRequest) {
  try {
    const dbManager = new Neo4jManager()

    // インポートジョブの一覧を取得
    const jobs = await dbManager.getImportJobs()

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

    const dbManager = new Neo4jManager()

    // セッションが存在するか確認
    const session = await dbManager.getSessionById(sessionId)
    if (!session) {
      return NextResponse.json(
        { error: 'Session not found' },
        { status: 404 }
      )
    }

    // 新しいインポートジョブを作成
    const job = await dbManager.createImportJob(sessionId)

    if (!job) {
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
      job: job
    })
  } catch (error) {
    console.error('Failed to create import job:', error)
    return NextResponse.json(
      { error: 'Failed to create import job' },
      { status: 500 }
    )
  }
}
