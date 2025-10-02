// Merkle DAG: 分析データAPIルート
// 分析データのHTTPインターフェース

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');
  const participantId = searchParams.get('participantId');
  const emotionName = searchParams.get('emotionName');

  try {
    // Dynamic import to avoid bundling issues
    let duckDBAdapter;
    try {
      const { duckDBAdapter: adapter } = await import('../../../../50_adapters/duckdb-adapter');
      duckDBAdapter = adapter;
    } catch (error) {
      console.warn('Analytical data adapter not available:', error);
      return NextResponse.json({ error: 'Analytical data adapter not available' }, { status: 503 });
    }

    switch (action) {
      case 'participants': {
        const participants = await duckDBAdapter.getAllParticipantAnalytics();
        return NextResponse.json({ participants });
      }

      case 'participant': {
        if (!participantId) {
          return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
        }
        const participant = await duckDBAdapter.getParticipantAnalytics(participantId);
        return NextResponse.json({ participant });
      }

      case 'emotionTimeSeries': {
        if (!participantId) {
          return NextResponse.json({ error: 'participantId is required' }, { status: 400 });
        }
        const timeSeries = await duckDBAdapter.getEmotionTimeSeries(participantId, emotionName || undefined);
        return NextResponse.json({ timeSeries });
      }

      case 'emotionDistribution': {
        const distribution = await duckDBAdapter.getEmotionDistribution(participantId || undefined);
        return NextResponse.json({ distribution });
      }

      case 'emotionCorrelations': {
        const correlations = await duckDBAdapter.getEmotionCorrelations();
        return NextResponse.json({ correlations });
      }

      case 'clusteringData': {
        const clusteringData = await duckDBAdapter.getClusteringData();
        return NextResponse.json({ clusteringData });
      }

      default: {
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: [
            'participants',
            'participant',
            'emotionTimeSeries',
            'emotionDistribution',
            'emotionCorrelations',
            'clusteringData'
          ]
        }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Analytical data API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    // Dynamic import to avoid bundling issues
    let duckDBAdapter;
    try {
      const { duckDBAdapter: adapter } = await import('../../../../50_adapters/duckdb-adapter');
      duckDBAdapter = adapter;
    } catch (error) {
      console.warn('Analytical data adapter not available:', error);
      return NextResponse.json({ error: 'Analytical data adapter not available' }, { status: 503 });
    }

    const body = await request.json();

    switch (action) {
      case 'syncParticipant': {
        await duckDBAdapter.syncParticipantData(body.participant);
        return NextResponse.json({ success: true });
      }

      case 'syncSession': {
        await duckDBAdapter.syncSessionData(body.session);
        return NextResponse.json({ success: true });
      }

      case 'syncEmotionAnalysis': {
        await duckDBAdapter.syncEmotionAnalysisData(body.analysis);
        return NextResponse.json({ success: true });
      }

      case 'initialize': {
        await duckDBAdapter.initialize();
        return NextResponse.json({ success: true });
      }

      default: {
        return NextResponse.json({
          error: 'Invalid action',
          availableActions: [
            'syncParticipant',
            'syncSession',
            'syncEmotionAnalysis',
            'initialize'
          ]
        }, { status: 400 });
      }
    }
  } catch (error) {
    console.error('Analytical data API POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
