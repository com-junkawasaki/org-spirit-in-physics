// Merkle DAG: experiments_api -> experiment_management_endpoints
// 実験管理APIエンドポイント - Next.js API Routesでの公開

import { NextRequest, NextResponse } from 'next/server'
import { getAllExperiments, getExperimentDetail } from '@/lib/data'
import { getSessionManager } from '@/lib/session-manager'
import { getAnalysisReporter } from '@/lib/analysis-reporter'

// GET /api/experiments - 実験一覧取得
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const experiments = await getAllExperiments()
    
    // ステータスフィルタ
    let filteredExperiments = experiments
    if (status && status !== 'all') {
      filteredExperiments = experiments.filter(exp => exp.status === status)
    }

    // ページネーション
    const paginatedExperiments = filteredExperiments.slice(offset, offset + limit)

    return NextResponse.json({
      experiments: paginatedExperiments,
      pagination: {
        total: filteredExperiments.length,
        limit,
        offset,
        hasMore: offset + limit < filteredExperiments.length
      }
    })
  } catch (error) {
    console.error('Failed to fetch experiments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch experiments' },
      { status: 500 }
    )
  }
}

// POST /api/experiments - 新規実験作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, experimentType = 'word_association' } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Experiment name is required' },
        { status: 400 }
      )
    }

    const sessionManager = getSessionManager()
    
    // 実験IDを生成
    const experimentId = `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Neo4jに実験を作成
    const query = `
      CREATE (e:Experiment {
        id: $experimentId,
        experiment_name: $name,
        description: $description,
        experiment_type: $experimentType,
        status: 'draft',
        start_date: datetime(),
        created_at: datetime(),
        updated_at: datetime()
      })
      RETURN e.id as id
    `
    
    const client = sessionManager['client'] // 内部クライアントにアクセス
    const result = await client.query(query, {
      experimentId,
      name,
      description: description || '',
      experimentType
    })

    return NextResponse.json({
      id: result[0]?.id || experimentId,
      name,
      description,
      status: 'draft',
      createdAt: new Date().toISOString()
    }, { status: 201 })
  } catch (error) {
    console.error('Failed to create experiment:', error)
    return NextResponse.json(
      { error: 'Failed to create experiment' },
      { status: 500 }
    )
  }
}
