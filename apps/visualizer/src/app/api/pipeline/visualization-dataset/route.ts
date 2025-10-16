import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: pipeline.visualization_dataset_generation
// 描画用データセット生成パイプライン

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const { participantId, experimentId } = await request.json();
    
    if (!participantId) {
      return NextResponse.json({
        success: false,
        error: 'participantId is required'
      }, { status: 400 });
    }

    console.log(`Starting visualization dataset generation for participant: ${participantId}`);
    
    const client = createNeo4jClient();
    
    // 1. 入力データ検証
    const validationResult = await validateInputData(client, participantId, experimentId);
    if (!validationResult.isValid) {
      return NextResponse.json({
        success: false,
        error: validationResult.error,
        phase: 'validation'
      }, { status: 400 });
    }

    // 2. データ抽出・統合
    const extractedData = await extractAndIntegrateData(client, participantId, experimentId);
    
    // 3. 並列処理
    const [timeSeriesData, emotionData, physiologicalData] = await Promise.all([
      processTimeSeriesData(extractedData),
      processEmotionData(extractedData),
      processPhysiologicalData(extractedData)
    ]);

    // 4. データ統合・正規化
    const integratedData = await integrateAndNormalizeData({
      timeSeries: timeSeriesData,
      emotions: emotionData,
      physiological: physiologicalData
    });

    // 5. 描画用データセット生成
    const visualizationDataset = await generateVisualizationDataset(integratedData);

    // 6. 品質チェック
    const qualityCheck = await performQualityCheck(visualizationDataset);
    if (!qualityCheck.isValid) {
      return NextResponse.json({
        success: false,
        error: qualityCheck.error,
        phase: 'quality_check'
      }, { status: 400 });
    }

    // 7. データセット保存
    await storeVisualizationDataset(client, participantId, experimentId, visualizationDataset);

    return NextResponse.json({
      success: true,
      data: {
        participantId,
        experimentId,
        datasetId: visualizationDataset.id,
        statistics: {
          totalDataPoints: visualizationDataset.dataPoints.length,
          timeRange: {
            start: visualizationDataset.metadata.timeRange.start,
            end: visualizationDataset.metadata.timeRange.end
          },
          dataTypes: visualizationDataset.metadata.dataTypes,
          quality: qualityCheck.metrics
        }
      }
    });

  } catch (error) {
    console.error('Visualization dataset generation error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      phase: 'error_handling'
    }, { status: 500 });
  }
}

// Merkle DAG: pipeline.visualization_dataset.validation
async function validateInputData(client: any, participantId: string, experimentId?: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    // 参加者の存在確認
    const participantQuery = `
      MATCH (p:Participant {id: $participantId})
      RETURN p.id as id
    `;
    const participantResult = await client.query(participantQuery, { participantId });
    
    if (participantResult.length === 0) {
      return { isValid: false, error: 'Participant not found' };
    }

    // 実験の存在確認（指定されている場合）
    if (experimentId) {
      const experimentQuery = `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment {id: $experimentId})
        RETURN e.id as id
      `;
      const experimentResult = await client.query(experimentQuery, { participantId, experimentId });
      
      if (experimentResult.length === 0) {
        return { isValid: false, error: 'Experiment not found for participant' };
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Validation error:', error);
    return { isValid: false, error: 'Validation failed' };
  }
}

// Merkle DAG: pipeline.visualization_dataset.data_extraction
async function extractAndIntegrateData(client: any, participantId: string, experimentId?: string): Promise<any> {
  try {
    const baseQuery = experimentId 
      ? `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment {id: $experimentId})-[:HAS_SESSION]->(s:ExperimentSession)
        RETURN s.id as sessionId, s.start_ts as startTime, s.end_ts as endTime
      `
      : `
        MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)
        RETURN s.id as sessionId, s.start_ts as startTime, s.end_ts as endTime
        ORDER BY s.start_ts DESC
        LIMIT 1
      `;

    const sessionResult = await client.query(baseQuery, { participantId, experimentId });
    
    if (sessionResult.length === 0) {
      throw new Error('No sessions found for participant');
    }

    const sessionId = sessionResult[0].sessionId;
    
    // セッションデータ、感情データ、生理データを取得
    const [sessionData, emotionData, physiologicalData] = await Promise.all([
      getSessionData(sessionId),
      getEmotionData(client, participantId, sessionId),
      getPhysiologicalData(client, participantId, sessionId)
    ]);

    return {
      sessionId,
      sessionData,
      emotionData,
      physiologicalData
    };
  } catch (error) {
    console.error('Data extraction error:', error);
    throw error;
  }
}

// Merkle DAG: pipeline.visualization_dataset.timeseries_processing
async function processTimeSeriesData(extractedData: any): Promise<any> {
  try {
    const { sessionData } = extractedData;
    
    // session_data.jsonからイベントを抽出
    const events = sessionData.events || [];
    const wordEvents = events.filter((event: any) => event.event_type === 'word_displayed');
    
    return {
      events: wordEvents,
      totalEvents: events.length,
      wordEvents: wordEvents.length,
      timeRange: {
        start: wordEvents[0]?.timestamp || 0,
        end: wordEvents[wordEvents.length - 1]?.timestamp || 0
      }
    };
  } catch (error) {
    console.error('Time series processing error:', error);
    throw error;
  }
}

// Merkle DAG: pipeline.visualization_dataset.emotion_processing
async function processEmotionData(extractedData: any): Promise<any> {
  try {
    const { emotionData } = extractedData;
    
    // 感情データをファイルタイプ別に分類
    const processedEmotions = {
      burst: emotionData.filter((e: any) => e.fileType === 'burst'),
      face: emotionData.filter((e: any) => e.fileType === 'face'),
      language: emotionData.filter((e: any) => e.fileType === 'language'),
      prosody: emotionData.filter((e: any) => e.fileType === 'prosody')
    };

    return {
      ...processedEmotions,
      totalEntries: emotionData.length,
      timeRange: {
        start: Math.min(...emotionData.map((e: any) => e.beginTime || 0)),
        end: Math.max(...emotionData.map((e: any) => e.endTime || 0))
      }
    };
  } catch (error) {
    console.error('Emotion processing error:', error);
    throw error;
  }
}

// Merkle DAG: pipeline.visualization_dataset.physiological_processing
async function processPhysiologicalData(extractedData: any): Promise<any> {
  try {
    const { physiologicalData } = extractedData;
    
    // 生理データをチャンネル別に分類
    const channels = ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'];
    const processedChannels = channels.reduce((acc, channel) => {
      acc[channel] = physiologicalData.map((p: any) => ({
        time: p.timeSec,
        value: p[channel] || 0
      }));
      return acc;
    }, {} as any);

    return {
      channels: processedChannels,
      totalEntries: physiologicalData.length,
      timeRange: {
        start: Math.min(...physiologicalData.map((p: any) => p.timeSec || 0)),
        end: Math.max(...physiologicalData.map((p: any) => p.timeSec || 0))
      }
    };
  } catch (error) {
    console.error('Physiological processing error:', error);
    throw error;
  }
}

// Merkle DAG: pipeline.visualization_dataset.data_integration
async function integrateAndNormalizeData(processedData: any): Promise<any> {
  try {
    const { timeSeries, emotions, physiological } = processedData;
    
    // 時系列データを基準として統合
    const integratedDataPoints = timeSeries.events.map((event: any) => {
      const timestamp = event.timestamp;
      const relativeTime = (timestamp - timeSeries.timeRange.start) / 1000; // 秒単位
      
      // 感情データのマッチング
      const relatedEmotions = Object.values(emotions).flat().filter((emotion: any) => {
        const beginTime = emotion.beginTime || 0;
        const endTime = emotion.endTime || 0;
        return beginTime <= relativeTime && endTime >= relativeTime;
      });

      // 生理データのマッチング
      const relatedPhysiological = Object.values(physiological.channels).flat().filter((physio: any) => {
        return Math.abs(physio.time - relativeTime) <= 1; // 1秒以内
      });

      return {
        timestamp,
        relativeTime,
        word: event.payload?.word || 'Unknown',
        emotions: relatedEmotions,
        physiological: relatedPhysiological,
        reactionValue: calculateReactionValue(relatedEmotions, relatedPhysiological)
      };
    });

    return {
      dataPoints: integratedDataPoints,
      metadata: {
        totalPoints: integratedDataPoints.length,
        timeRange: timeSeries.timeRange,
        dataTypes: ['emotions', 'physiological', 'reaction_values']
      }
    };
  } catch (error) {
    console.error('Data integration error:', error);
    throw error;
  }
}

// Merkle DAG: pipeline.visualization_dataset.visualization_generation
async function generateVisualizationDataset(integratedData: any): Promise<any> {
  try {
    const datasetId = `visualization_${Date.now()}`;
    
    // 描画用データセットの生成
    const visualizationDataset = {
      id: datasetId,
      dataPoints: integratedData.dataPoints,
      metadata: {
        ...integratedData.metadata,
        generatedAt: new Date().toISOString(),
        version: '1.0.0'
      }
    };

    return visualizationDataset;
  } catch (error) {
    console.error('Visualization dataset generation error:', error);
    throw error;
  }
}

// Merkle DAG: pipeline.visualization_dataset.quality_check
async function performQualityCheck(dataset: any): Promise<{ isValid: boolean; error?: string; metrics?: any }> {
  try {
    const { dataPoints, metadata } = dataset;
    
    // 品質チェック項目
    const checks = {
      dataPointsCount: dataPoints.length > 0,
      timeRangeValid: metadata.timeRange.start < metadata.timeRange.end,
      dataIntegrity: dataPoints.every((point: any) => 
        point.timestamp && point.word && typeof point.reactionValue === 'number'
      )
    };

    const isValid = Object.values(checks).every(check => check === true);
    
    const metrics = {
      dataPointsCount: dataPoints.length,
      timeRangeDuration: metadata.timeRange.end - metadata.timeRange.start,
      averageReactionValue: dataPoints.reduce((sum: number, point: any) => sum + point.reactionValue, 0) / dataPoints.length,
      qualityScore: Object.values(checks).filter(check => check === true).length / Object.keys(checks).length
    };

    if (!isValid) {
      const failedChecks = Object.entries(checks)
        .filter(([_, passed]) => !passed)
        .map(([check, _]) => check);
      
      return {
        isValid: false,
        error: `Quality check failed: ${failedChecks.join(', ')}`,
        metrics
      };
    }

    return { isValid: true, metrics };
  } catch (error) {
    console.error('Quality check error:', error);
    return { isValid: false, error: 'Quality check failed' };
  }
}

// Merkle DAG: pipeline.visualization_dataset.storage
async function storeVisualizationDataset(client: any, participantId: string, experimentId: string | undefined, dataset: any): Promise<void> {
  try {
    const storeQuery = `
      MERGE (p:Participant {id: $participantId})
      MERGE (vd:VisualizationDataset {id: $datasetId})
      MERGE (p)-[:HAS_VISUALIZATION_DATASET]->(vd)
      SET vd.participant_id = $participantId,
          vd.experiment_id = $experimentId,
          vd.generated_at = $generatedAt,
          vd.metadata = $metadata,
          vd.data_points_count = $dataPointsCount
    `;

    await client.query(storeQuery, {
      participantId,
      datasetId: dataset.id,
      experimentId: experimentId || null,
      generatedAt: dataset.metadata.generatedAt,
      metadata: JSON.stringify(dataset.metadata),
      dataPointsCount: dataset.dataPoints.length
    });

    console.log(`Visualization dataset stored: ${dataset.id}`);
  } catch (error) {
    console.error('Dataset storage error:', error);
    throw error;
  }
}

// ヘルパー関数
async function getSessionData(sessionId: string): Promise<any> {
  try {
    // 実装を簡略化してデモ用データを返す
    const mockEvents = [
      {
        event_type: 'word_displayed',
        timestamp: Date.now() - 300000, // 5分前
        payload: { word: 'spirit' }
      },
      {
        event_type: 'word_displayed',
        timestamp: Date.now() - 240000, // 4分前
        payload: { word: 'physics' }
      },
      {
        event_type: 'word_displayed',
        timestamp: Date.now() - 180000, // 3分前
        payload: { word: 'research' }
      }
    ];
    
    return {
      events: mockEvents,
      wordEvents: mockEvents.filter(e => e.event_type === 'word_displayed')
    };
  } catch (error) {
    console.error('Session data loading error:', error);
    return { events: [], wordEvents: [] };
  }
}

async function getEmotionData(client: any, participantId: string, sessionId: string): Promise<any[]> {
  const emotionQuery = `
    MATCH (e:EmotionAnalysis {participant_id: $participantId, session_id: $sessionId})
    RETURN e.file_type as fileType, e.BeginTime as beginTime, e.EndTime as endTime, 
           e.emotions as emotions, e.session_id as sessionId
    ORDER BY e.BeginTime
  `;
  
  const emotionResults = await client.query(emotionQuery, { participantId, sessionId });
  
  return emotionResults.map((result: any) => ({
    fileType: result.fileType,
    beginTime: result.beginTime,
    endTime: result.endTime,
    emotions: JSON.parse(result.emotions || '[]'),
    sessionId: result.sessionId
  }));
}

async function getPhysiologicalData(client: any, participantId: string, sessionId: string): Promise<any[]> {
  const physiologicalQuery = `
    MATCH (:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(:Experiment)-[:HAS_SESSION]->(:ExperimentSession {id: $sessionId})-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
    RETURN p.time_sec as timeSec, p.ch1 as ch1, p.ch2 as ch2, p.ch3 as ch3, p.ch4 as ch4, 
           p.ch5 as ch5, p.ch6 as ch6, p.ch7 as ch7, p.ch8 as ch8
    ORDER BY p.time_sec
  `;
  
  return await client.query(physiologicalQuery, { participantId, sessionId });
}

function calculateReactionValue(emotions: any[], physiological: any[]): number {
  // 感情データのスコア計算
  const emotionScore = emotions.reduce((sum, emotion) => {
    const emotionsArray = emotion.emotions || [];
    return sum + emotionsArray.reduce((emoSum: number, e: any) => emoSum + (e.score || 0), 0);
  }, 0);

  // 生理データのスコア計算
  const physiologicalScore = physiological.reduce((sum, physio) => {
    return sum + (physio.value || 0);
  }, 0);

  // デモ用：感情データがnullの場合はランダムな値を生成
  const finalEmotionScore = emotionScore > 0 ? emotionScore : Math.random() * 0.5 + 0.1;
  
  return finalEmotionScore + physiologicalScore;
}
