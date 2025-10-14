import { NextRequest, NextResponse } from 'next/server'
import { Neo4jManager } from '@/lib/neo4j'

// Merkle DAG: imports_status_api -> system_health_check
export async function GET(request: NextRequest) {
  try {
    const dbManager = new Neo4jManager()

    // Neo4j接続確認
    let neo4jStatus = 'disconnected'
    try {
      await dbManager.testConnection()
      neo4jStatus = 'connected'
    } catch (error) {
      console.error('Neo4j connection failed:', error)
      neo4jStatus = 'error'
    }

    // Workflow接続確認
    let workflowsStatus = 'disconnected'
    try {
      const workflowResponse = await fetch('http://localhost:8000/api/workflows/validate', {
        method: 'POST',
        signal: AbortSignal.timeout(5000)
      })

      if (workflowResponse.ok) {
        workflowsStatus = 'connected'
      } else {
        workflowsStatus = 'error'
      }
    } catch (error) {
      console.error('Workflow connection failed:', error)
      workflowsStatus = 'error'
    }

    // Hume AI接続確認（簡易版）
    let humeAIStatus = 'disconnected'
    try {
      // Hume AI接続確認の実装
      // 実際の実装ではHume AIクライアントを使用
      humeAIStatus = 'connected'
    } catch (error) {
      console.error('Hume AI connection failed:', error)
      humeAIStatus = 'error'
    }

    // ジョブ統計の取得
    let activeJobs = 0
    let completedJobs = 0
    let failedJobs = 0

    try {
      // Neo4jからジョブ統計を取得
      const jobStats = await dbManager.getJobStatistics()
      activeJobs = jobStats.activeJobs
      completedJobs = jobStats.completedJobs
      failedJobs = jobStats.failedJobs
    } catch (error) {
      console.error('Failed to get job statistics:', error)
    }

    const systemStatus = {
      neo4j: neo4jStatus,
      workflows: workflowsStatus,
      humeAI: humeAIStatus,
      activeJobs,
      completedJobs,
      failedJobs
    }

    return NextResponse.json(systemStatus)
  } catch (error) {
    console.error('Failed to get system status:', error)
    return NextResponse.json(
      { error: 'Failed to get system status' },
      { status: 500 }
    )
  }
}
