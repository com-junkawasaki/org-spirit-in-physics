// Merkle DAG: api.participants.word2vec
// Word2Vec embeddings API endpoint for research app

import type { APIRoute } from 'astro';

// Disable prerendering for dynamic API routes
export const prerender = false;

// Get GraphQL API URL from environment
function getGraphQLApiUrl(): string {
  return import.meta.env.GRAPHQL_API_URL || 'http://graphql-service:8081/graphql';
}

export const GET: APIRoute = async ({ params }) => {
  const participantId = params.participantId;
  if (!participantId) {
    return new Response(JSON.stringify({ success: false, error: 'participantId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Fetch analysis results directly from GraphQL using fetch
    const query = `
      query GetAnalysisResults($participantId: ID!) {
        analysisResults(participantId: $participantId) {
          id
          responseWord
          word2vecComponent
        }
      }
    `;

    const variables = { participantId };
    const graphqlUrl = getGraphQLApiUrl();
    
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
      throw new Error(`GraphQL request failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    if (result.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(result.errors)}`);
    }

    const responses = result.data?.analysisResults || [];
    
    // Extract word embeddings from responses
    // Note: GraphQL doesn't return full embeddings, so return empty array for now
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
    console.error('Word2Vec API error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        wordData: [], // Return empty array on error
      }),
      {
        status: 200, // Return 200 with empty data instead of error
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

