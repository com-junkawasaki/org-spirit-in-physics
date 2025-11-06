import { NextRequest, NextResponse } from 'next/server';

// Merkle DAG: api.participants.word2vec -> word2vec_data_fetch
// 参加者のWord2Vecデータ取得API
// 依存関係: GraphQL analysis_results query

// GraphQL URL取得関数（サーバーサイド用）
function getGraphQLUrl(): string {
  // Environment variable takes precedence
  if (process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL) {
    return process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL;
  }
  
  // Server-side: use Docker service name or localhost
  return process.env.RUST_GRAPHQL_URL || 'http://graphql:3003/graphql';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    // Next.js 14/15 compatibility: params might be a Promise or direct object
    const resolvedParams = params instanceof Promise ? await params : params;
    const { id: participantId } = resolvedParams;
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    console.log(`API: Fetching Word2Vec data via GraphQL for participant ${participantId}${sessionId ? `, session ${sessionId}` : ''}`);

    const graphqlUrl = getGraphQLUrl();
    console.log(`API: Using GraphQL URL: ${graphqlUrl}`);

    // GraphQLクエリを構築
    const query = `
      query GetAnalysisResults($participantId: String, $experimentId: String) {
        analysisResults(participantId: $participantId, experimentId: $experimentId) {
          id
          participantId
          experimentId
          wordStimulusId
          stimulusWord
          responseWord
          reactionTimeMs
          spiritProbability
          word2VecComponent
          reactionTimeComponent
          skinPotentialComponent
          emotionComponent
          emotionData
          physiologicalData
          createdAt
          updatedAt
        }
      }
    `;

    const variables: { participantId: string; experimentId?: string } = {
      participantId,
    };

    if (sessionId) {
      variables.experimentId = sessionId;
    }

    // GraphQLクエリを実行
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`GraphQL request failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (result.errors) {
      console.error('API: GraphQL errors:', result.errors);
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const analysisResults = result.data?.analysisResults || [];
    console.log(`API: Found ${analysisResults.length} analysis results for participant ${participantId}`);

    if (analysisResults.length === 0) {
      return NextResponse.json({
        success: true,
        participantId,
        wordData: [],
        message: 'No analysis results found for this participant'
      });
    }

    // Merkle DAG: api.participants.word2vec.generate_embeddings
    // 簡易Word2Vec埋め込み生成（実際の実装では事前学習済みモデルを使用）
    const wordData = analysisResults.map((result: any, index: number) => {
      // 簡易埋め込み生成（実際の実装ではWord2Vecモデルを使用）
      const embedding = generateSimpleEmbedding(result.stimulusWord, result.responseWord, index);
      
      return {
        word: result.stimulusWord,
        embedding,
        spiritProbability: result.spiritProbability || 0.5,
        reactionTime: result.reactionTimeMs || 0,
        timestamp: result.createdAt || result.updatedAt || new Date().toISOString(),
        participantId,
        responseId: result.id
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
    const resolvedParams = params instanceof Promise ? await params : params;
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        participantId: resolvedParams.id
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
