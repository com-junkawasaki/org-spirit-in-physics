// Merkle DAG: api.graphql.proxy
// GraphQL API proxy endpoint for client-side requests
// This allows browser to make GraphQL requests through Next.js API route
// avoiding CORS and mixed content issues

import { NextRequest, NextResponse } from 'next/server';
import { getGraphQLApiUrl } from '@/lib/graphql/client';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get GraphQL API URL (server-side)
    const graphqlUrl = getGraphQLApiUrl();
    
    // Forward the GraphQL request to the GraphQL service
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: body.query,
        variables: body.variables || {},
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GraphQL Proxy] HTTP error:', response.status, errorText);
      return NextResponse.json(
        { 
          errors: [{ 
            message: `GraphQL request failed: ${response.status} ${response.statusText}`,
          }] 
        },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[GraphQL Proxy] Error:', error);
    return NextResponse.json(
      { 
        errors: [{ 
          message: error.message || 'GraphQL request failed',
        }] 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: 'GraphQL endpoint - use POST for queries' });
}

