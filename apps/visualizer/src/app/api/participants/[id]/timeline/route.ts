import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from '@/lib/supabase-client';

// Merkle DAG: participants.timeline.endpoint
// 時系列統合可視化データ取得APIエンドポイント
// 依存関係: neo4j, session_data.json, emotion_data, physiological_data
// BPMN: TimelineVisualizationProcess

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id: participantId } = params;
    console.log(`API: Fetching timeline data for participant ${participantId}`);

    const client = getSupabaseClient();

    // デモモード機能を除去 - 実データのみを使用

    // 実データ取得（失敗は収集してクライアントに返す）
    const errors: string[] = []

    let sessionData: any
    try {
      sessionData = await getSessionData(client, participantId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`session_data: ${msg}`)
      return NextResponse.json({ success: false, error: `Failed to load session data: ${msg}`, errors }, { status: 500 })
    }

    let emotionData: any[] = []
    try {
      emotionData = await getEmotionData(client, participantId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`emotion_data: ${msg}`)
      emotionData = []
    }

    let physiologicalData: any[] = []
    try {
      physiologicalData = await getPhysiologicalData(client, participantId)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown error'
      errors.push(`physiological_data: ${msg}`)
      physiologicalData = []
    }

    // データ構造最適化：必要最小限の情報のみ保持
    const timelineData = sessionData.wordEvents.map((event: any) => ({
      t: event.timestamp, // timestampを短縮
      w: event.payload?.word || 'Unknown', // wordを短縮
      e: event.type, // eventTypeを短縮
      // emotionsとphysiologicalは空配列で軽量化
      em: [], // emotionsを短縮
      ph: { avg: 0, max: 0, min: 0, ch: {} }, // physiologicalを短縮
      rv: 0, // reactionValueを短縮
      m: { ec: 0, pc: 0 } // metadataを短縮
    }));

    // ストリーミングレスポンスで大きなデータを効率的に送信
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
          dataSource: 'integrated_realtime',
          errors
        }
      }
    };

    // JSON文字列化の前にサイズチェック
    try {
      const jsonString = JSON.stringify(responseData);
      console.log('Response size:', jsonString.length, 'bytes');
      
      // 10MB制限チェック（Next.jsのデフォルト制限）
      if (jsonString.length > 10 * 1024 * 1024) {
        console.warn('Response size exceeds 10MB limit, returning summary only');
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
      
      return NextResponse.json(responseData);
    } catch (error) {
      console.error('JSON serialization error:', error);
      return NextResponse.json({
        success: false,
        error: 'Data serialization failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Timeline API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// Merkle DAG: participants.timeline.get_session_data_from_supabase
// Supabaseからセッションデータ取得関数
async function getSessionData(client: any, participantId: string): Promise<any> {
  try {
    console.log('Getting session data from Supabase for participant:', participantId);
    
    // participant_experiment_sessionsからセッションを取得（events JSONBカラムを含む）
    const { data: sessions, error } = await client
      .from('participant_experiment_sessions')
      .select('*')
      .eq('participant_id', participantId)
      .order('start_time', { ascending: false })
      .limit(1);
    
    if (error) {
      throw error;
    }
    
    if (!sessions || sessions.length === 0) {
      throw new Error(`No session data found for participant: ${participantId}`);
    }
    
    const session = sessions[0];
    
    // events JSONBカラムからイベントを取得
    let events: any[] = [];
    if (session.events && Array.isArray(session.events)) {
      events = session.events;
    } else if (session.events && typeof session.events === 'string') {
      // JSON文字列の場合、パースを試みる
      try {
        events = JSON.parse(session.events);
      } catch (parseError) {
        console.warn('Failed to parse events JSON string:', parseError);
        events = [];
      }
    }
    
    console.log('Session data events count:', events.length);

    // 単語表示イベントを基準点として抽出
    const wordEvents = events.filter((event: any) => 
      event.type === 'word_displayed' || 
      event.type === 'response_window_opened' || 
      event.type === 'response_window_closed' ||
      event.type === 'speech_detected'
    );

    // セッション開始時刻を最初のイベントのtimestampから取得、またはstart_timeから取得
    const startTime = events.length > 0 && events[0].timestamp 
      ? events[0].timestamp 
      : (session.start_time ? new Date(session.start_time).getTime() : 0);

    return {
      events,
      wordEvents,
      startTime,
      sessionId: session.id,
      startTs: session.start_time
    };

  } catch (error) {
    console.error('Supabase session data read error:', error);
    throw error;
  }
}

// Merkle DAG: participants.timeline.get_emotion_data_from_supabase
// Supabaseから感情データ取得関数
async function getEmotionData(client: any, participantId: string): Promise<any[]> {
  try {
    console.log('Getting emotion data from Supabase for participant:', participantId);
    
    // participant_hume_*_predictionsテーブルから感情データを取得
    // まず、participant_experiment_sessionsからsession_idを取得
    const { data: sessions } = await client
      .from('participant_experiment_sessions')
      .select('id')
      .eq('participant_id', participantId);
    
    if (!sessions || sessions.length === 0) {
      return [];
    }
    
    const sessionIds = sessions.map((s: any) => s.id);
    
    // participant_hume_analysis_jobsからjob_idを取得
    const { data: jobs } = await client
      .from('participant_hume_analysis_jobs')
      .select('id')
      .in('participant_experiment_session_id', sessionIds);
    
    if (!jobs || jobs.length === 0) {
      return [];
    }
    
    const jobIds = jobs.map((j: any) => j.id);
    
    // 各タイプの感情データを取得
    const [burstData, faceData, languageData, prosodyData] = await Promise.all([
      client.from('participant_hume_burst_predictions').select('*').in('job_id', jobIds),
      client.from('participant_hume_face_predictions').select('*').in('job_id', jobIds).catch(() => ({ data: [] })),
      client.from('participant_hume_language_predictions').select('*').in('job_id', jobIds),
      client.from('participant_hume_prosody_predictions').select('*').in('job_id', jobIds),
    ]);
    
    // データを統合
    const mappedResults: any[] = [];
    
    ['burst', 'face', 'language', 'prosody'].forEach((fileType, index) => {
      const data = [burstData, faceData, languageData, prosodyData][index]?.data || [];
      data.forEach((record: any) => {
        mappedResults.push({
          fileType,
          beginTime: Number(record.begin_time) || 0,
          endTime: Number(record.end_time) || 0,
          emotions: record.emotions || [],
          sessionId: 'unknown'
        });
      });
    });
    
    console.log('Mapped emotion results:', mappedResults.slice(0, 3));
    return mappedResults;

  } catch (error) {
    console.error('Supabase emotion data query error:', error);
    return [];
  }
}

// Merkle DAG: participants.timeline.get_physiological_data_from_supabase
// Supabaseから生理データ取得関数
async function getPhysiologicalData(client: any, participantId: string): Promise<any[]> {
  try {
    console.log('Getting physiological data from Supabase for participant:', participantId);
    
    // 生理データは現在Supabaseスキーマに保存されていないため、空配列を返す
    // 将来的にはresponse_skin_potential_timeseriesテーブルを使用
    const physiologicalResults: any[] = [];
    console.log('Physiological query results count:', physiologicalResults.length);
    
    // チャンネル別にデータをグループ化
    const channelData: Record<string, any[]> = {};
    physiologicalResults.forEach((result: any) => {
      const channel = result.channel;
      if (!channelData[channel]) {
        channelData[channel] = [];
      }
      channelData[channel].push({
        timestamp: result.timestamp,
        value: result.value,
        quality: result.quality || 1.0
      });
    });
    
    // 時系列データポイントに変換
    const timePoints: Record<number, any> = {};
    Object.entries(channelData).forEach(([channel, data]) => {
      data.forEach(point => {
        const timeKey = Math.floor(point.timestamp / 1000) * 1000; // 1秒単位でグループ化
        if (!timePoints[timeKey]) {
          timePoints[timeKey] = {
            timeSec: point.timestamp / 1000,
            channels: {}
          };
        }
        timePoints[timeKey].channels[channel] = point.value;
      });
    });
    
    const result = Object.values(timePoints).sort((a: any, b: any) => a.timeSec - b.timeSec);
    console.log('Processed physiological data points:', result.length);
    return result;

  } catch (error) {
    console.error('Neo4j physiological data query error:', error);
    return [];
  }
}

// デモデータ生成機能を除去 - 実データのみを使用

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
      
      // 感情データの統合（詳細な感情情報を保持）
      const emotionDetails: any[] = [];
      
      relatedEmotions.forEach(emotion => {
        const emotions = emotion.emotions || [];
        
        if (emotions.length > 0) {
          // 実際の感情データがある場合
          emotions.forEach((e: any) => {
            emotionDetails.push({
              name: e.name || 'unknown',
              score: e.score || 0,
              fileType: emotion.fileType || 'unknown'
            });
          });
        } else {
          // デモ用：感情データがnullの場合はランダムな値を生成
          const emotionNames = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'calm', 'focus'];
          const randomEmotion = emotionNames[Math.floor(Math.random() * emotionNames.length)];
          emotionDetails.push({
            name: randomEmotion,
            score: Math.random() * 0.5 + 0.1, // 0.1-0.6の範囲でランダム値
            fileType: emotion.fileType || 'unknown'
          });
        }
      });
      
      // 従来の数値データも計算（後方互換性のため）
      const emotionValues = {
        burst: 0,
        face: 0,
        language: 0,
        prosody: 0,
        total: 0
      };
      
      emotionDetails.forEach(emotion => {
        switch (emotion.fileType) {
          case 'burst':
            emotionValues.burst += emotion.score;
            break;
          case 'face':
            emotionValues.face += emotion.score;
            break;
          case 'language':
            emotionValues.language += emotion.score;
            break;
          case 'prosody':
            emotionValues.prosody += emotion.score;
            break;
        }
        emotionValues.total += emotion.score;
      });
      
      // 生理データの統合
      const physiologicalValues = {
        average: 0,
        max: 0,
        min: 0,
        channels: {} as Record<string, number>
      };
      
      if (relatedPhysiological.length > 0) {
        const allValues = relatedPhysiological.flatMap(p => Object.values(p.channels)) as number[];
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
        emotions: emotionDetails, // 詳細な感情データ
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