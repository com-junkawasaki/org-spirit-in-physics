// Merkle DAG: api.participants.word2vec
// Word2Vec embeddings API endpoint for research app

import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { participantId: string } }
) {
  const participantId = params.participantId;
  if (!participantId) {
    return NextResponse.json(
      { success: false, error: 'participantId is required' },
      { status: 400 }
    );
  }

  try {
    // Word2Vec embeddings are not currently available via gRPC
    // Return empty array for now - this endpoint is called but embeddings are optional
    // In a real implementation, you would fetch embeddings from a separate endpoint or database
    
    const wordData: Array<{ word: string; embedding: number[] }> = [];

    return NextResponse.json(
      {
        success: true,
        wordData,
      },
      {
        headers: {
          'Cache-Control': 'public, max-age=300', // 5 minutes cache
        },
      }
    );
  } catch (error) {
    // Silently return empty data - embeddings are optional
    return NextResponse.json(
      {
        success: true,
        wordData: [], // Return empty array on error
      }
    );
  }
}
