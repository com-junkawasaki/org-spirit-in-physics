// @ts-nocheck
/**
 * Merkle DAG: graphql.client
 * Apollo Client configuration for GraphQL API
 * 
 * @deprecated This file is deprecated. Use gRPC client instead.
 * See: apps/unified/src/lib/participant/grpc/client.ts
 */

import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { createClient as createSupabaseServerClient } from '@/lib/supabase/server';

// GraphQL API URL
const GRAPHQL_API_URL = 
  typeof window !== 'undefined' 
    ? (process.env.NEXT_PUBLIC_GRAPHQL_API_URL || 'http://localhost:8081/graphql')
    : (process.env.GRAPHQL_API_URL || 'http://localhost:8081/graphql');

// HTTP Link
const httpLink = createHttpLink({
  uri: GRAPHQL_API_URL,
  credentials: 'include',
});

// Error Link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }

  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
  }
});

// Auth Link with Supabase token
const authLink = setContext(async (_, { headers }) => {
  let token: string | null = null;

  if (typeof window !== 'undefined') {
    // Client-side: use Supabase client
    const supabase = createSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    token = session?.access_token || null;
  } else {
    // Server-side: use Supabase server client
    // Note: This won't work in all contexts - may need to pass cookies/request
    try {
      const supabase = createSupabaseServerClient();
      const { data: { session } } = await supabase.auth.getSession();
      token = session?.access_token || null;
    } catch (error) {
      console.warn('Failed to get server-side session:', error);
    }
  }

  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : '',
    },
  };
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
  },
});
