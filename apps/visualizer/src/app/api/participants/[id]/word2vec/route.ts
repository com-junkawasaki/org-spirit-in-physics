import { NextRequest, NextResponse } from 'next/server';
import { createNeo4jClient } from '@/lib/neo4j';

// Merkle DAG: api.participants.word2vec -> word2vec_data_fetch
// 参加者のWord2Vecデータ取得API
// 依存関係: neo4j, participants/[id]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: participantId } = await params;
    console.log(`API: Fetching Word2Vec data for participant ${participantId}`);

    const client = createNeo4jClient();

    // Merkle DAG: api.participants.word2vec.query_responses
    // 参加者の応答データを取得（Experiment階層経由）
    const responseQuery = `
      MATCH (p:Participant {id: $participantId})-[:HAS_EXPERIMENT]->(e:Experiment)-[:HAS_SESSION]->(s:ExperimentSession)-[:HAS_RESPONSE]->(r:Response)
      WHERE r.stimulus_word IS NOT NULL AND r.response_word IS NOT NULL
      RETURN 
        r.stimulus_word as stimulus_word,
        r.response_word as response_word,
        r.reaction_time_ms as reaction_time_ms,
        r.spirit_probability as spirit_probability,
        r.event_ts as timestamp,
        r.id as response_id,
        e.id as experiment_id,
        s.id as session_id
      ORDER BY r.event_ts
    `;

    const responses = await client.query(responseQuery, { participantId });
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
    const wordData = responses.map((response: any, index: number) => {
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
        participantId: (await params).id
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
