import { NextRequest, NextResponse } from "next/server";
import { createNeo4jClient } from '@/lib/neo4j';
import { Neo4jQueryBuilder } from '@/lib/neo4j-query-builder';
import { TimelineIntegrationPointManager } from '@/lib/neo4j-timeline-manager';
import { convertTimelinePointsToApiResponse } from '@/lib/timeline-integration-converter';
import {
  getSessionData,
  getEmotionData,
  getPhysiologicalData,
  integrateTimelineData,
} from '@/lib/timeline-integration-functions';

// Merkle DAG: participants.timeline.endpoint
// 時系列統合可視化データ取得APIエンドポイント
// 依存関係: neo4j, session_data.json, emotion_data, physiological_data
// BPMN: TimelineVisualizationProcess

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const startTime = Date.now();
  try {
    const { id: participantId } = params;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    console.log(`[TIMELINE API] ===== Request started =====`);
    console.log(`[TIMELINE API] Participant: ${participantId}${sessionId ? `, Session: ${sessionId}` : ''}`);
    console.log(`[TIMELINE API] Timestamp: ${new Date().toISOString()}`);

    const client = createNeo4jClient();
    console.log(`[TIMELINE API] Neo4j client created`);

    // 事前計算済みデータを優先的に使用（sessionIdが提供されている場合のみ）
    const manager = new TimelineIntegrationPointManager();
    let checkResult: { exists: boolean; count: number; maxVersion?: number; minTimestamp?: number; maxTimestamp?: number } | null = null;
    
    if (sessionId) {
      checkResult = await manager.checkTimelinePointsExist(participantId, sessionId);
    }
    
    if (checkResult && checkResult.exists && checkResult.count > 0) {
      console.log(`[TIMELINE API] Using pre-computed timeline points (${checkResult.count} points)`);
      console.log(`[TIMELINE API] Version: ${checkResult.maxVersion}, Time range: ${checkResult.minTimestamp} - ${checkResult.maxTimestamp}`);
      
      try {
        const timelinePoints = await manager.getTimelinePoints(participantId, sessionId || undefined);
        const timelineData = convertTimelinePointsToApiResponse(timelinePoints);
        
        const totalTime = Date.now() - startTime;
        console.log(`[TIMELINE API] ===== Response from pre-computed data =====`);
        console.log(`[TIMELINE API] Total processing time: ${totalTime}ms`);
        console.log(`[TIMELINE API] Timeline data points: ${timelineData.length}`);
        
        const responseData = {
          success: true,
          data: {
            participantId,
            timelineData: timelineData,
            metadata: {
              sessionEvents: timelinePoints.length,
              emotionEntries: timelinePoints.reduce((sum, p) => sum + p.metadata.emotionCount, 0),
              physiologicalEntries: timelinePoints.reduce((sum, p) => sum + p.metadata.physiologicalCount, 0),
              totalDataPoints: timelineData.length,
              processingTimeMs: totalTime,
              dataSource: 'pre_computed',
              version: checkResult.maxVersion,
              errors: []
            }
          }
        };

        console.log(`[TIMELINE API] Serializing response to JSON...`);
        const serializeStartTime = Date.now();
        const jsonString = JSON.stringify(responseData);
        const serializeDuration = Date.now() - serializeStartTime;
        const sizeMB = jsonString.length / (1024 * 1024);
        console.log(`[TIMELINE API] ✓ JSON serialized in ${serializeDuration}ms (${sizeMB.toFixed(2)}MB)`);
        
        console.log(`[TIMELINE API] ===== Sending response =====`);
        const response = NextResponse.json(responseData);
        console.log(`[TIMELINE API] ✓ Response sent successfully`);
        return response;
      } catch (error) {
        console.error('[TIMELINE API] Error loading pre-computed data, attempting to regenerate:', error);
        // フォールバック: 事前計算を実行
      }
    } else {
      console.log(`[TIMELINE API] No pre-computed data found, generating timeline points...`);
    }

    // 事前計算済みデータが存在しない場合、事前計算を実行（sessionIdが提供されている場合のみ）
    if (sessionId && (!checkResult || !checkResult.exists || checkResult.count === 0)) {
      try {
        console.log(`[TIMELINE API] Starting batch integration to generate timeline points...`);
        const { generateTimelinePoints } = await import('@/lib/timeline-batch-processor');
        const batchResult = await generateTimelinePoints(participantId, sessionId);
        
        if (batchResult.success && batchResult.createdCount > 0) {
          console.log(`[TIMELINE API] ✓ Batch integration completed: ${batchResult.createdCount} points created in ${batchResult.totalTimeMs}ms`);
          
          // 作成されたTimelineIntegrationPointを取得
          const timelinePoints = await manager.getTimelinePoints(participantId, sessionId || undefined);
          const timelineData = convertTimelinePointsToApiResponse(timelinePoints);
          
          const totalTime = Date.now() - startTime;
          console.log(`[TIMELINE API] ===== Response from newly generated data =====`);
          console.log(`[TIMELINE API] Total processing time: ${totalTime}ms (batch: ${batchResult.totalTimeMs}ms)`);
          console.log(`[TIMELINE API] Timeline data points: ${timelineData.length}`);
          
          const responseData = {
            success: true,
            data: {
              participantId,
              timelineData: timelineData,
              metadata: {
                sessionEvents: timelinePoints.length,
                emotionEntries: timelinePoints.reduce((sum, p) => sum + p.metadata.emotionCount, 0),
                physiologicalEntries: timelinePoints.reduce((sum, p) => sum + p.metadata.physiologicalCount, 0),
                totalDataPoints: timelineData.length,
                processingTimeMs: totalTime,
                batchProcessingTimeMs: batchResult.totalTimeMs,
                dataSource: 'newly_generated',
                version: 1,
                errors: []
              }
            }
          };

          console.log(`[TIMELINE API] Serializing response to JSON...`);
          const serializeStartTime = Date.now();
          const jsonString = JSON.stringify(responseData);
          const serializeDuration = Date.now() - serializeStartTime;
          const sizeMB = jsonString.length / (1024 * 1024);
          console.log(`[TIMELINE API] ✓ JSON serialized in ${serializeDuration}ms (${sizeMB.toFixed(2)}MB)`);
          
          console.log(`[TIMELINE API] ===== Sending response =====`);
          const response = NextResponse.json(responseData);
          console.log(`[TIMELINE API] ✓ Response sent successfully`);
          return response;
        } else {
          console.error(`[TIMELINE API] Batch integration failed: ${batchResult.error}`);
          // フォールバック: リアルタイム統合処理に進む
        }
      } catch (error) {
        console.error('[TIMELINE API] Error during batch integration, falling back to real-time integration:', error);
        // フォールバック: リアルタイム統合処理に進む
      }
    }

    // デモモード機能を除去 - 実データのみを使用

    // 実データ取得（失敗は収集してクライアントに返す）
    const errors: string[] = []

    let sessionData: any
    try {
      console.log(`[TIMELINE API] Step 1/4: Fetching session data...`);
      const sessionStartTime = Date.now();
      sessionData = await getSessionData(client, participantId, sessionId || undefined)
      const sessionDuration = Date.now() - sessionStartTime;
      console.log(`[TIMELINE API] ✓ Session data fetched in ${sessionDuration}ms (${sessionData.wordEvents?.length || 0} word events)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`session_data: ${msg}`)
      return NextResponse.json({ success: false, error: `Failed to load session data: ${msg}`, errors }, { status: 500 })
    }

    let emotionData: any[] = []
    try {
      console.log(`[TIMELINE API] Step 2/4: Fetching emotion data...`);
      const emotionStartTime = Date.now();
      emotionData = await getEmotionData(client, participantId, sessionId || undefined)
      const emotionDuration = Date.now() - emotionStartTime;
      console.log(`[TIMELINE API] ✓ Emotion data fetched in ${emotionDuration}ms (${emotionData.length} entries)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`emotion_data: ${msg}`)
      emotionData = []
    }

    let physiologicalData: any[] = []
    try {
      console.log(`[TIMELINE API] Step 3/4: Fetching physiological data...`);
      const physioStartTime = Date.now();
      physiologicalData = await getPhysiologicalData(client, participantId, sessionId || undefined)
      const physioDuration = Date.now() - physioStartTime;
      console.log(`[TIMELINE API] ✓ Physiological data fetched in ${physioDuration}ms (${physiologicalData.length} entries)`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`physiological_data: ${msg}`)
      physiologicalData = []
    }

    // 実データを統合（セッション×感情×生理）し、クライアント期待形式へ変換
    console.log(`[TIMELINE API] Step 4/4: Integrating timeline data...`);
    console.log(`[TIMELINE API]   - Session events: ${sessionData.wordEvents?.length || 0}`);
    console.log(`[TIMELINE API]   - Emotion entries: ${emotionData.length}`);
    console.log(`[TIMELINE API]   - Physiological entries: ${physiologicalData.length}`);
    const integrationStartTime = Date.now();
    const integrated = integrateTimelineData(sessionData, emotionData, physiologicalData)
    const integrationDuration = Date.now() - integrationStartTime;
    console.log(`[TIMELINE API] ✓ Integration completed in ${integrationDuration}ms (${integrated.length} timeline points)`);
    
    console.log('=== Timeline Integration Summary ===');
    console.log('Integrated timeline data count:', integrated.length);
    console.log('Session data:', {
      startTime: sessionData.startTime,
      wordEventsCount: sessionData.wordEvents?.length || 0,
      firstWordTimestamp: sessionData.wordEvents?.[0]?.timestamp || null
    });
    console.log('Emotion data from Neo4j:', {
      count: emotionData.length,
      firstSample: emotionData.length > 0 ? {
        beginTime: emotionData[0].beginTime,
        endTime: emotionData[0].endTime,
        fileType: emotionData[0].fileType,
        emotionsCount: emotionData[0].emotions?.length || 0,
        emotions: emotionData[0].emotions?.slice(0, 3) || []
      } : null,
      timeRange: emotionData.length > 0 ? {
        minBeginTime: Math.min(...emotionData.map(e => e.beginTime || 0)),
        maxBeginTime: Math.max(...emotionData.map(e => e.beginTime || 0)),
        minEndTime: Math.min(...emotionData.map(e => e.endTime || 0)),
        maxEndTime: Math.max(...emotionData.map(e => e.endTime || 0))
      } : null,
      emotionTypeBreakdown: emotionData.reduce((acc: any, e: any) => {
        const type = e.fileType || 'unknown';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {})
    });
    
    if (integrated.length > 0) {
      const pointsWithEmotions = integrated.filter((pt: any) => pt.emotions && pt.emotions.length > 0);
      console.log(`Points with emotions: ${pointsWithEmotions.length}/${integrated.length}`);
      
      if (pointsWithEmotions.length > 0) {
        const sampleWithEmotions = pointsWithEmotions[0];
        console.log('Sample point with emotions:', {
          word: sampleWithEmotions.word,
          timestamp: sampleWithEmotions.timestamp,
          emotionsCount: sampleWithEmotions.emotions.length,
          emotionTypes: [...new Set(sampleWithEmotions.emotions.map((e: any) => e.fileType))],
          firstEmotions: sampleWithEmotions.emotions.slice(0, 3)
        });
      } else {
        console.log('⚠️ WARNING: No emotion data found in integrated timeline data');
        console.log('⚠️ Emotion data details:', {
          totalEmotionData: emotionData.length,
          emotionDataWithEmotions: emotionData.filter(e => e.emotions && e.emotions.length > 0).length,
          sampleEmotionData: emotionData.slice(0, 3).map(e => ({
            fileType: e.fileType,
            beginTime: e.beginTime,
            endTime: e.endTime,
            emotionsCount: e.emotions?.length || 0,
            emotions: e.emotions?.slice(0, 2) || []
          }))
        });
        // 時間マッチングの問題を診断
        if (sessionData.startTime === 0) {
          console.log('⚠️ Session start time is 0 - this may cause time matching issues');
        }
        if (emotionData.length > 0 && sessionData.wordEvents?.length > 0) {
          const firstWordTime = sessionData.wordEvents[0].timestamp;
          const firstEmotionTime = emotionData[0].beginTime;
          const timeDiff = Math.abs((firstWordTime - sessionData.startTime) / 1000 - firstEmotionTime);
          console.log('Time matching diagnostic:', {
            firstWordTimestamp: firstWordTime,
            firstWordRelativeSec: (firstWordTime - sessionData.startTime) / 1000,
            firstEmotionBeginTimeSec: firstEmotionTime,
            timeDifferenceSec: timeDiff,
            sessionStartTime: sessionData.startTime
          });
          
          // 最初の10件の感情データと単語イベントの時間を比較
          console.log('First 5 emotion data times:', emotionData.slice(0, 5).map(e => ({
            fileType: e.fileType,
            beginTime: e.beginTime,
            endTime: e.endTime,
            emotionsCount: e.emotions?.length || 0
          })));
          console.log('First 5 word event times:', sessionData.wordEvents.slice(0, 5).map((e: any) => ({
            timestamp: e.timestamp,
            relativeSec: (e.timestamp - sessionData.startTime) / 1000,
            word: e.payload?.word
          })));
        }
      }
    }
    
    const timelineData = integrated.map((pt: any) => {
      // NaNを防ぐための安全な変換
      const safeReactionValue = typeof pt.reactionValue === 'number' && !isNaN(pt.reactionValue) ? pt.reactionValue : 0;
      const safePhysioAverage = typeof pt?.physiological?.average === 'number' && !isNaN(pt.physiological.average) ? pt.physiological.average : 0;
      const safePhysioMax = typeof pt?.physiological?.max === 'number' && !isNaN(pt.physiological.max) ? pt.physiological.max : 0;
      const safePhysioMin = typeof pt?.physiological?.min === 'number' && !isNaN(pt.physiological.min) ? pt.physiological.min : 0;
      
      return {
        t: pt.timestamp,
        w: pt.word,
        e: pt.eventType,
        rt: pt.reactionTime ?? null, // 反応時間を追加
        em: Array.isArray(pt.emotions) ? pt.emotions : [],
        ph: {
          average: safePhysioAverage,
          max: safePhysioMax,
          min: safePhysioMin,
          channels: pt?.physiological?.channels ?? {}
        },
        rv: safeReactionValue,
        m: {
          ec: pt?.metadata?.emotionCount ?? 0,
          pc: pt?.metadata?.physiologicalCount ?? 0
        }
      };
    })

    // ストリーミングレスポンスで大きなデータを効率的に送信
    const totalTime = Date.now() - startTime;
    console.log(`[TIMELINE API] ===== Response preparation =====`);
    console.log(`[TIMELINE API] Total processing time: ${totalTime}ms`);
    console.log(`[TIMELINE API] Timeline data points: ${timelineData.length}`);
    
    const responseData = {
      success: true,
      data: {
        participantId,
        timelineData: timelineData,
        metadata: {
          sessionEvents: sessionData.wordEvents.length,
          emotionEntries: emotionData.length,
          physiologicalEntries: physiologicalData.length,
          totalDataPoints: timelineData.length,
          processingTimeMs: totalTime,
          dataSource: 'integrated_realtime',
          errors
        }
      }
    };

    // JSON文字列化の前にサイズチェック
    try {
      console.log(`[TIMELINE API] Serializing response to JSON...`);
      const serializeStartTime = Date.now();
      const jsonString = JSON.stringify(responseData);
      const serializeDuration = Date.now() - serializeStartTime;
      const sizeMB = jsonString.length / (1024 * 1024);
      console.log(`[TIMELINE API] ✓ JSON serialized in ${serializeDuration}ms (${sizeMB.toFixed(2)}MB)`);
      
      // 10MB制限チェック（Next.jsのデフォルト制限）
      if (jsonString.length > 10 * 1024 * 1024) {
        console.warn(`[TIMELINE API] ⚠️ Response size exceeds 10MB limit (${sizeMB.toFixed(2)}MB), truncating to 1000 points`);
        return NextResponse.json({
          success: true,
          data: {
            participantId,
            timelineData: timelineData.slice(0, 1000), // フォールバック：1000件まで
            metadata: {
              ...responseData.data.metadata,
              totalDataPoints: Math.min(timelineData.length, 1000),
              truncated: true,
              originalSize: timelineData.length
            }
          }
        });
      }
      
      console.log(`[TIMELINE API] ===== Sending response =====`);
      const response = NextResponse.json(responseData);
      console.log(`[TIMELINE API] ✓ Response sent successfully`);
      return response;
    } catch (error) {
      console.error('JSON serialization error:', error);
      return NextResponse.json({
        success: false,
        error: 'Data serialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('=== Timeline API Error ===');
    console.error('Error type:', error instanceof Error ? error.constructor.name : typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // エラーオブジェクトの詳細を出力
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      if ((error as any).code) {
        console.error('Error code:', (error as any).code);
      }
      if ((error as any).cause) {
        console.error('Error cause:', (error as any).cause);
      }
    }
    
    // Neo4j固有のエラー情報を出力
    if (error && typeof error === 'object') {
      const errorObj = error as any;
      if (errorObj.code) {
        console.error('Neo4j error code:', errorObj.code);
      }
      if (errorObj.message) {
        console.error('Neo4j error message:', errorObj.message);
      }
      if (errorObj.stack) {
        console.error('Full error object:', JSON.stringify(errorObj, Object.getOwnPropertyNames(errorObj), 2));
      }
    }
    
    // エラーの種類を識別
    let errorCategory = 'Unknown';
    if (error instanceof Error) {
      if (error.message.includes('Neo4j') || error.message.includes('Cypher')) {
        errorCategory = 'Neo4j Query Error';
      } else if (error.message.includes('JSON') || error.message.includes('parse')) {
        errorCategory = 'JSON Parse Error';
      } else if (error.message.includes('timeout') || error.message.includes('Timeout')) {
        errorCategory = 'Timeout Error';
      } else if (error.message.includes('connection') || error.message.includes('Connection')) {
        errorCategory = 'Connection Error';
      }
    }
    
    console.error('Error category:', errorCategory);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorCategory,
      details: process.env.NODE_ENV === 'development' ? {
        stack: error instanceof Error ? error.stack : undefined,
        type: error instanceof Error ? error.constructor.name : typeof error
      } : undefined
    }, { status: 500 });
  }
}

// ローカル関数定義は削除 - timeline-integration-functions.tsからインポート
// getSessionData, getEmotionData, getPhysiologicalData, integrateTimelineData は共通モジュールからインポート済み

// Merkle DAG: participants.timeline -> implementation_complete
// 時系列統合可視化データ取得APIの実装完了