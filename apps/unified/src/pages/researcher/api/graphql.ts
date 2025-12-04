import type { APIRoute } from 'astro';
import { getGraphQLApiUrl } from '../../../lib/researcher/graphql/client';
import { createClient } from '../../../lib/researcher/supabase/server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies: astroCookies }) => {
  try {
    const body = await request.json();
    
    // Get GraphQL API URL (server-side)
    const graphqlUrl = getGraphQLApiUrl();
    
    // Get Supabase session token
    const supabase = await createClient(astroCookies);
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || null;
    
    // Forward the GraphQL request to the GraphQL service
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(graphqlUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        query: body.query,
        variables: body.variables || {},
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[GraphQL Proxy] HTTP error:', response.status, errorText);
      return new Response(
        JSON.stringify({ 
          errors: [{ 
            message: `GraphQL request failed: ${response.status} ${response.statusText}`,
          }] 
        }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await response.json();
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
  } catch (error: any) {
    console.error('[GraphQL Proxy] Error:', error);
    return new Response(
      JSON.stringify({ 
        errors: [{ 
          message: error.message || 'GraphQL request failed',
        }] 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  return new Response(
    JSON.stringify({ message: 'GraphQL endpoint - use POST for queries' }),
    { headers: { 'Content-Type': 'application/json' } }
  );
};

