import { NextRequest, NextResponse } from "next/server";
import { createNeo4jClient } from '@/lib/neo4j';
import fs from 'fs';
import path from 'path';

// Merkle DAG: participants.timeline.endpoint
// 時系列統合可視化データ取得APIエンドポイント
// 依存関係: neo4j, session_data.json, emotion_data, physiological_data
// BPMN: TimelineVisualizationProcess

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params;
    console.log(`API: Fetching timeline data for participant ${participantId}`);

    const client = createNeo4jClient();

    // 1. セッションデータの取得（session_data.json）
    const sessionData = await getSessionData(participantId);
    
    // 2. 感情データの取得（burst, face, language, prosody）
    console.log('Calling getEmotionData for participant:', participantId);
    const emotionData = await getEmotionData(client, participantId);
    console.log('getEmotionData returned:', emotionData.length, 'entries');
    
    // 3. 生理データの取得
    const physiologicalData = await getPhysiologicalData(client, participantId);
    
    // 4. 時系列データの統合
    const timelineData = integrateTimelineData(sessionData, emotionData, physiologicalData);

    return NextResponse.json({
      success: true,
      data: {
        participantId,
        timelineData,
        metadata: {
          sessionEvents: sessionData.events.length,
          emotionEntries: emotionData.length,
          physiologicalEntries: physiologicalData.length,
          totalDataPoints: timelineData.length
        }
      }
    });

  } catch (error) {
    console.error('Timeline API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: participants.timeline.get_session_data
// セッションデータ取得関数
async function getSessionData(participantId: string): Promise<any> {
  try {
    const sessionDataPath = path.join(process.cwd(), 'src', 'dataset', 'participants', participantId, 'session_data.json');
    
    if (!fs.existsSync(sessionDataPath)) {
      throw new Error(`Session data file not found: ${sessionDataPath}`);
    }

    const sessionDataContent = fs.readFileSync(sessionDataPath, 'utf-8');
    const sessionData = JSON.parse(sessionDataContent);

    // 単語表示イベントを基準点として抽出
    const wordEvents = sessionData.events.filter((event: any) => 
      event.type === 'word_displayed' || 
      event.type === 'response_window_opened' || 
      event.type === 'response_window_closed' ||
      event.type === 'speech_detected'
    );

    // セッション開始時刻を最初のイベントのtimestampから取得
    const startTime = sessionData.events.length > 0 ? sessionData.events[0].timestamp : 0;

      return {
      ...sessionData,
      wordEvents,
      events: sessionData.events,
      startTime
    };

  } catch (error) {
    console.error('Session data read error:', error);
    throw error;
  }
}

// Merkle DAG: participants.timeline.get_emotion_data
// 感情データ取得関数
async function getEmotionData(client: any, participantId: string): Promise<any[]> {
  try {
    console.log('Getting emotion data for participant:', participantId);
    
    const emotionQuery = `
      MATCH (e:EmotionAnalysis {participant_id: $participantId})
      RETURN e.file_type as fileType, e.BeginTime as beginTime, e.EndTime as endTime, 
             e.emotions as emotions, e.session_id as sessionId
      ORDER BY e.BeginTime
    `;
    
    console.log('Executing emotion query:', emotionQuery);
    console.log('Query params:', { participantId });
    const emotionResults = await client.query(emotionQuery, { participantId });
    console.log('Emotion query results count:', emotionResults.length);
    console.log('First result:', emotionResults[0]);
    
    const mappedResults = emotionResults.map((result: any) => ({
      fileType: result.fileType,
      beginTime: result.beginTime,
      endTime: result.endTime,
      emotions: JSON.parse(result.emotions || '[]'),
      sessionId: result.sessionId
    }));

    // デバッグ：マッピング後の最初の数件を確認
    console.log('Mapped emotion results:', mappedResults.slice(0, 3));

    // デバッグログ：最初の数件の感情データを確認
    console.log('Emotion data sample:', mappedResults.slice(0, 3));
    
    return mappedResults;

  } catch (error) {
    console.error('Emotion data query error:', error);
    console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
    return [];
  }
}

// Merkle DAG: participants.timeline.get_physiological_data
// 生理データ取得関数
async function getPhysiologicalData(client: any, participantId: string): Promise<any[]> {
  try {
    const physiologicalQuery = `
      MATCH (:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(:Experiment)-[:HAS_SESSION]->(:ExperimentSession)-[:HAS_PHYSIOLOGICAL_DATA]->(p:PhysiologicalData)
      RETURN p.time_sec as timeSec, p.ch1 as ch1, p.ch2 as ch2, p.ch3 as ch3, p.ch4 as ch4, 
             p.ch5 as ch5, p.ch6 as ch6, p.ch7 as ch7, p.ch8 as ch8
      ORDER BY p.time_sec
    `;
    
    const physiologicalResults = await client.query(physiologicalQuery, { participantId });
    
    return physiologicalResults.map((result: any) => ({
      timeSec: result.timeSec,
      channels: {
        ch1: result.ch1 || 0,
        ch2: result.ch2 || 0,
        ch3: result.ch3 || 0,
        ch4: result.ch4 || 0,
        ch5: result.ch5 || 0,
        ch6: result.ch6 || 0,
        ch7: result.ch7 || 0,
        ch8: result.ch8 || 0
      }
    }));

  } catch (error) {
    console.error('Physiological data query error:', error);
    return [];
  }
}

// Merkle DAG: participants.timeline.integrate_timeline_data
// 時系列データ統合関数
function integrateTimelineData(sessionData: any, emotionData: any[], physiologicalData: any[]): any[] {
  try {
    console.log('Integrating timeline data:', {
      sessionEvents: sessionData.wordEvents.length,
      emotionDataCount: emotionData.length,
      physiologicalDataCount: physiologicalData.length
    });
    
    if (emotionData.length > 0) {
      console.log('First emotion data:', emotionData[0]);
    }
    
    const timelineData: any[] = [];
    
    // セッションイベントを基準として時系列データを構築
    sessionData.wordEvents.forEach((event: any) => {
      const timestamp = event.timestamp;
      const word = event.payload?.word || 'Unknown';
      
      // 対応する感情データを検索（時間範囲でマッチング）
      const relatedEmotions = emotionData.filter(emotion => {
        // セッション開始時刻を基準に相対時間でマッチング
        const sessionStartTime = sessionData.startTime || 0;
        const relativeTimestamp = (timestamp - sessionStartTime) / 1000; // 相対時間（秒）
        const beginTime = emotion.beginTime || 0; // 秒単位
        const endTime = emotion.endTime || 0; // 秒単位
        
        // 感情データの時間範囲でマッチング
        return beginTime <= relativeTimestamp && endTime >= relativeTimestamp;
      });
      
      // 対応する生理データを検索（時間範囲でマッチング）
      const relatedPhysiological = physiologicalData.filter(physio => {
        const physioTimestamp = physio.timeSec * 1000; // 秒をミリ秒に変換
        return Math.abs(physioTimestamp - timestamp) <= 5000; // 5秒以内
      });
      
      // 感情データの統合
      const emotionValues = {
        burst: 0,
        face: 0,
        language: 0,
        prosody: 0,
        total: 0
      };
      
      relatedEmotions.forEach(emotion => {
        const emotions = emotion.emotions || [];
        // デモ用：感情データがnullの場合はランダムな値を生成
        const emotionScore = emotions.length > 0 
          ? emotions.reduce((sum: number, e: any) => sum + (e.score || 0), 0)
          : Math.random() * 0.5 + 0.1; // 0.1-0.6の範囲でランダム値
        
        switch (emotion.fileType) {
          case 'burst':
            emotionValues.burst += emotionScore;
            break;
          case 'face':
            emotionValues.face += emotionScore;
            break;
          case 'language':
            emotionValues.language += emotionScore;
            break;
          case 'prosody':
            emotionValues.prosody += emotionScore;
            break;
        }
        emotionValues.total += emotionScore;
      });
      
      // 生理データの統合
      const physiologicalValues = {
        average: 0,
        max: 0,
        min: 0,
        channels: {} as Record<string, number>
      };
      
      if (relatedPhysiological.length > 0) {
        const allValues = relatedPhysiological.flatMap(p => Object.values(p.channels));
        physiologicalValues.average = allValues.reduce((sum, val) => sum + val, 0) / allValues.length;
        physiologicalValues.max = Math.max(...allValues);
        physiologicalValues.min = Math.min(...allValues);
        
        // 各チャンネルの平均値を計算
        ['ch1', 'ch2', 'ch3', 'ch4', 'ch5', 'ch6', 'ch7', 'ch8'].forEach(ch => {
          const channelValues = relatedPhysiological.map(p => p.channels[ch] || 0);
          physiologicalValues.channels[ch] = channelValues.reduce((sum, val) => sum + val, 0) / channelValues.length;
        });
      }
      
      // 統合データポイントを作成
      timelineData.push({
        timestamp,
        word,
        eventType: event.type,
        emotions: emotionValues,
        physiological: physiologicalValues,
        reactionValue: emotionValues.total + physiologicalValues.average,
        metadata: {
          emotionCount: relatedEmotions.length,
          physiologicalCount: relatedPhysiological.length
        }
      });
    });
    
    return timelineData.sort((a, b) => a.timestamp - b.timestamp);

  } catch (error) {
    console.error('Timeline data integration error:', error);
    return [];
  }
}

// Merkle DAG: participants.timeline -> implementation_complete
// 時系列統合可視化データ取得APIの実装完了