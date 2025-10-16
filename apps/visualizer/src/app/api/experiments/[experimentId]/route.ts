// Merkle DAG: experiment_detail_api -> experiment_detail_endpoints
// 実験詳細APIエンドポイント - Next.js API Routesでの公開

import { NextRequest, NextResponse } from 'next/server'
import { getExperimentDetail, getExperimentSessions, getExperimentParticipants, getExperimentAnalysis, getExperimentTimeline } from '@/lib/data'
import { getSessionManager } from '@/lib/session-manager'

interface RouteParams {
  params: {
    experimentId: string
  }
}

// GET /api/experiments/[experimentId] - 実験詳細取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { experimentId } = params
    const { searchParams } = new URL(request.url)
    const include = searchParams.get('include')?.split(',') || ['basic']

    const result: any = {}

    // 基本情報
    if (include.includes('basic')) {
      result.experiment = await getExperimentDetail(experimentId)
      if (!result.experiment) {
        return NextResponse.json(
          { error: 'Experiment not found' },
          { status: 404 }
        )
      }
    }

    // セッション情報
    if (include.includes('sessions')) {
      result.sessions = await getExperimentSessions(experimentId)
    }

    // 参加者情報
    if (include.includes('participants')) {
      result.participants = await getExperimentParticipants(experimentId)
    }

    // 分析結果
    if (include.includes('analysis')) {
      result.analysis = await getExperimentAnalysis(experimentId)
    }

    // タイムライン
    if (include.includes('timeline')) {
      result.timeline = await getExperimentTimeline(experimentId)
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch experiment detail:', error)
    return NextResponse.json(
      { error: 'Failed to fetch experiment detail' },
      { status: 500 }
    )
  }
}

// PUT /api/experiments/[experimentId] - 実験更新
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { experimentId } = params
    const body = await request.json()
    const { name, description, status } = body

    const sessionManager = getSessionManager()
    const client = sessionManager['client']

    // 実験の存在確認
    const existingExperiment = await getExperimentDetail(experimentId)
    if (!existingExperiment) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      )
    }

    // 更新クエリ
    const query = `
      MATCH (e:Experiment {id: $experimentId})
      SET e += $updates
      RETURN e.id as id, e.experiment_name as name, e.description as description, e.status as status
    `

    const updates: any = {
      updated_at: new Date().toISOString()
    }

    if (name) updates.experiment_name = name
    if (description !== undefined) updates.description = description
    if (status) updates.status = status

    const result = await client.query(query, {
      experimentId,
      updates
    })

    return NextResponse.json({
      id: result[0]?.id,
      name: result[0]?.name,
      description: result[0]?.description,
      status: result[0]?.status,
      updatedAt: updates.updated_at
    })
  } catch (error) {
    console.error('Failed to update experiment:', error)
    return NextResponse.json(
      { error: 'Failed to update experiment' },
      { status: 500 }
    )
  }
}

// DELETE /api/experiments/[experimentId] - 実験削除
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { experimentId } = params

    const sessionManager = getSessionManager()
    const client = sessionManager['client']

    // 実験の存在確認
    const existingExperiment = await getExperimentDetail(experimentId)
    if (!existingExperiment) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      )
    }

    // 関連データも含めて削除
    const query = `
      MATCH (e:Experiment {id: $experimentId})
      OPTIONAL MATCH (e)-[:HAS_SESSION]->(s:ExperimentSession)
      OPTIONAL MATCH (s)-[:HAS_RESPONSE]->(r:Response)
      OPTIONAL MATCH (s)-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
      DETACH DELETE e, s, r, p
    `

    await client.query(query, { experimentId })

    return NextResponse.json({
      message: 'Experiment deleted successfully',
      experimentId
    })
  } catch (error) {
    console.error('Failed to delete experiment:', error)
    return NextResponse.json(
      { error: 'Failed to delete experiment' },
      { status: 500 }
    )
  }
}
