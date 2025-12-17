import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { serverTimelineClient } from '@/lib/connect/server-client';
import type { GetTimelineRequest } from '@/generated/proto/timeline/v1/timeline';

// Merkle DAG: api.participants.word2vec -> word2vec_data_fetch
// 参加者のWord2Vecデータ取得API（Connect RPC版）
// Connect RPC経由でデータを取得

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const { id: participantId } = resolvedParams;
    console.log(`API: Fetching Word2Vec data for participant ${participantId}`);

    // Connect RPC経由でタイムラインデータを取得
    const rpcRequest: GetTimelineRequest = { participantId };
    const timelineResponse = await serverTimelineClient.getTimeline(rpcRequest);
    const timelinePoints = timelineResponse.points || [];
    
    // Transform to timeline format
    const timeline = timelinePoints.map((point) => ({
      time: point.time?.seconds ? new Date(point.time.seconds * 1000).toISOString() : null,
      word: point.word || null,
      hasResponse: point.hasResponse,
      reactionTime: point.reactionTime || null,
      reactionValue: point.reactionValue || null,
      sessionId: point.sessionId || null,
    }));
    
    // タイムラインデータから単語データを抽出
    const responses = timeline
      .filter((point) => point.word && point.hasResponse)
      .map((point) => ({
        stimulus_word: point.word || '',
        response_word: point.word || '', // 応答語はタイムラインデータに含まれていないため、同じ単語を使用
        reaction_time_ms: point.reactionTime ? point.reactionTime * 1000 : null,
        spirit_probability: point.reactionValue || 0.5,
        timestamp: point.time,
        response_id: point.time, // タイムスタンプをIDとして使用
        experiment_id: point.sessionId || point.session_id,
        session_id: point.sessionId || point.session_id
      }));

    console.log(`API: Found ${responses.length} responses for participant ${participantId}`);

    if (responses.length === 0) {
      return NextResponse.json({
        success: true,
        participantId,
        wordData: [],
        message: 'No response data found for this participant'
      });
    }

    // Merkle DAG: api.participants.word2vec.generate_embeddings
    // 簡易Word2Vec埋め込み生成（実際の実装では事前学習済みモデルを使用）
    const wordData = responses.map((response: { stimulus_word: string; response_word: string; spirit_probability?: number; reaction_time_ms?: number | null; timestamp: string | null; response_id: string | null; experiment_id?: string | null; session_id?: string | null }, index: number) => {
      // 簡易埋め込み生成（実際の実装ではWord2Vecモデルを使用）
      const embedding = generateSimpleEmbedding(response.stimulus_word, response.response_word, index);
      
      return {
        word: response.stimulus_word,
        embedding,
        spiritProbability: response.spirit_probability || 0.5,
        reactionTime: response.reaction_time_ms || 0,
        timestamp: response.timestamp,
        participantId,
        responseId: response.response_id
      };
    });

    console.log(`API: Generated ${wordData.length} word embeddings`);

    return NextResponse.json({
      success: true,
      participantId,
      wordData,
      statistics: {
        totalWords: wordData.length,
        uniqueWords: new Set(wordData.map(d => d.word)).size,
        averageSpiritProbability: wordData.reduce((sum, d) => sum + d.spiritProbability, 0) / wordData.length,
        averageReactionTime: wordData.reduce((sum, d) => sum + d.reactionTime, 0) / wordData.length
      }
    });

  } catch (error) {
    console.error('API: Failed to fetch Word2Vec data:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        participantId: params.id
      },
      { status: 500 }
    );
  }
}

// Merkle DAG: api.participants.word2vec.embedding_generation
// 簡易埋め込み生成関数（実際の実装ではWord2Vecモデルを使用）
function generateSimpleEmbedding(stimulusWord: string, responseWord: string, index: number): number[] {
  // 300次元の埋め込みベクトルを生成
  const embedding = new Array(300).fill(0);
  
  // 単語の文字コードをベースにした簡易埋め込み
  const stimulusChars = stimulusWord.split('').map(c => c.charCodeAt(0));
  const responseChars = responseWord.split('').map(c => c.charCodeAt(0));
  
  // 刺激語の特徴
  stimulusChars.forEach((charCode, i) => {
    if (i < 50) { // 最初の50文字のみ使用
      embedding[i] = Math.sin(charCode * 0.01) * 0.5;
      embedding[i + 50] = Math.cos(charCode * 0.01) * 0.5;
    }
  });
  
  // 応答語の特徴
  responseChars.forEach((charCode, i) => {
    if (i < 50) { // 最初の50文字のみ使用
      embedding[i + 100] = Math.sin(charCode * 0.01) * 0.5;
      embedding[i + 150] = Math.cos(charCode * 0.01) * 0.5;
    }
  });
  
  // インデックスベースの特徴
  embedding[200] = Math.sin(index * 0.1) * 0.3;
  embedding[201] = Math.cos(index * 0.1) * 0.3;
  
  // 単語長の特徴
  embedding[202] = Math.sin(stimulusWord.length * 0.1) * 0.2;
  embedding[203] = Math.cos(responseWord.length * 0.1) * 0.2;
  
  // 残りの次元はランダムノイズ
  for (let i = 204; i < 300; i++) {
    embedding[i] = (Math.random() - 0.5) * 0.1;
  }
  
  return embedding;
}
