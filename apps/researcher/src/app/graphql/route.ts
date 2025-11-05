//! GraphQL HTTP Route Handler (DEPRECATED)
//! 
//! Merkle DAG: graphql.route
//! OWL: spirit:GraphQL Service Port HTTP handler
//! 
//! DEPRECATED: This Next.js GraphQL handler is deprecated.
//! Please use the Rust GraphQL server at http://localhost:3003/graphql
//! or set NEXT_PUBLIC_RUST_GRAPHQL_URL environment variable.
//! 
//! Next.js App Router route handler for GraphQL API

import { NextRequest, NextResponse } from 'next/server';
import { graphql, getIntrospectionQuery } from 'graphql';
import { schema } from './schema-simple';
import { getSupabaseClient } from '@spiritinphysics/supabase';

/**
 * GET handler - GraphQL introspection and health check
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const query = url.searchParams.get('query') || getIntrospectionQuery();

  try {
    const supabase = getSupabaseClient();
    
    const result = await graphql({
      schema,
      source: query,
      contextValue: {
        supabase,
        rustActivitiesUrl: process.env.RUST_ACTIVITIES_URL || 'http://localhost:3001',
      } as any,
    });

    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        errors: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      },
      { status: 500 }
    );
  }
}

/**
 * POST handler - GraphQL query/mutation execution
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, variables, operationName } = body;

    if (!query) {
      return NextResponse.json(
        {
          errors: [{ message: 'Query is required' }],
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();
    
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
      operationName,
      contextValue: {
        supabase,
        rustActivitiesUrl: process.env.RUST_ACTIVITIES_URL || 'http://localhost:3001',
      } as any,
    });

    return NextResponse.json(result, {
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        errors: [
          {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        ],
      },
      { status: 500 }
    );
  }
}

