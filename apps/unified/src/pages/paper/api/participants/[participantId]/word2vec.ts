// Merkle DAG: api.participants.word2vec
// Word2Vec embeddings API endpoint for research app

import type { APIRoute } from 'astro';

// Disable prerendering for dynamic API routes
export const prerender = false;

export const GET: APIRoute = async ({ params }) => {
  const participantId = params.participantId;
  if (!participantId) {
    return new Response(JSON.stringify({ success: false, error: 'participantId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Word2Vec embeddings are not currently available via gRPC
    // Return empty array for now - this endpoint is called but embeddings are optional
    // In a real implementation, you would fetch embeddings from a separate endpoint or database
    
    const wordData: Array<{ word: string; embedding: number[] }> = [];

    return new Response(
      JSON.stringify({
        success: true,
        wordData,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300', // 5 minutes cache
        },
      }
    );
  } catch (error) {
    // Silently return empty data - embeddings are optional
    return new Response(
      JSON.stringify({
        success: true,
        wordData: [], // Return empty array on error
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

