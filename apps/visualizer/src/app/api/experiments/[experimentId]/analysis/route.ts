// Merkle DAG: experiment_analysis_api -> experiment_analysis_endpoints
// 実験分析APIエンドポイント - Next.js API Routesでの公開

import { NextRequest, NextResponse } from 'next/server'
import { getAnalysisReporter } from '@/lib/analysis-reporter'

interface RouteParams {
  params: {
    experimentId: string
  }
}

// GET /api/experiments/[experimentId]/analysis - 実験分析結果取得
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { experimentId } = params
    const { searchParams } = new URL(request.url)
    
    const includeParticipantDetails = searchParams.get('includeParticipants') === 'true'
    const includeSessionDetails = searchParams.get('includeSessions') === 'true'
    const includeStatisticalAnalysis = searchParams.get('includeStats') === 'true'
    const includeInsights = searchParams.get('includeInsights') === 'true'
    const includeRecommendations = searchParams.get('includeRecommendations') === 'true'
    const format = searchParams.get('format') as 'json' | 'markdown' | 'html' || 'json'

    const analysisReporter = getAnalysisReporter()
    
    const report = await analysisReporter.generateReport(experimentId, {
      includeParticipantDetails,
      includeSessionDetails,
      includeStatisticalAnalysis,
      includeInsights,
      includeRecommendations,
      format
    })

    if (format === 'json') {
      return NextResponse.json(report)
    } else {
      const exportedReport = analysisReporter.exportReport(report, format)
      
      const contentType = format === 'markdown' ? 'text/markdown' : 'text/html'
      const filename = `experiment-analysis-${experimentId}-${new Date().toISOString().split('T')[0]}.${format === 'markdown' ? 'md' : 'html'}`
      
      return new NextResponse(exportedReport, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      })
    }
  } catch (error) {
    console.error('Failed to generate analysis report:', error)
    return NextResponse.json(
      { error: 'Failed to generate analysis report' },
      { status: 500 }
    )
  }
}

// POST /api/experiments/[experimentId]/analysis - 分析実行
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { experimentId } = params
    const body = await request.json()
    const { analysisType = 'full', options = {} } = body

    const analysisReporter = getAnalysisReporter()
    
    // 分析タイプに応じたオプション設定
    let reportOptions = {
      includeParticipantDetails: true,
      includeSessionDetails: true,
      includeStatisticalAnalysis: true,
      includeInsights: true,
      includeRecommendations: true,
      ...options
    }

    if (analysisType === 'quick') {
      reportOptions = {
        includeParticipantDetails: false,
        includeSessionDetails: false,
        includeStatisticalAnalysis: true,
        includeInsights: false,
        includeRecommendations: false,
        ...options
      }
    } else if (analysisType === 'detailed') {
      reportOptions = {
        includeParticipantDetails: true,
        includeSessionDetails: true,
        includeStatisticalAnalysis: true,
        includeInsights: true,
        includeRecommendations: true,
        ...options
      }
    }

    const report = await analysisReporter.generateReport(experimentId, reportOptions)

    return NextResponse.json({
      analysisId: `analysis_${experimentId}_${Date.now()}`,
      experimentId,
      analysisType,
      generatedAt: report.generatedAt,
      summary: report.summary,
      insights: report.insights,
      recommendations: report.recommendations
    })
  } catch (error) {
    console.error('Failed to execute analysis:', error)
    return NextResponse.json(
      { error: 'Failed to execute analysis' },
      { status: 500 }
    )
  }
}
