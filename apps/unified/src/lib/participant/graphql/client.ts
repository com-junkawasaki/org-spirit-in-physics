/**
 * Merkle DAG: graphql.client
 * Apollo Client configuration for GraphQL API
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
  // Get Supabase token (works on both client and server)
  let token: string | null = null;
  
  if (typeof window !== 'undefined') {
    // Client-side: get token from Supabase client
    try {
      const supabase = createSupabaseClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Failed to get Supabase session:', error);
      } else {
        token = session?.access_token || null;
      }
    } catch (error) {
      console.warn('Failed to get Supabase token:', error);
    }
  } else {
    // Server-side: get token from cookies via Supabase server client
    try {
      const supabase = await createSupabaseServerClient();
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.warn('Failed to get Supabase session:', error);
      } else {
        token = session?.access_token || null;
      }
    } catch (error) {
      console.warn('Failed to get Supabase token from server:', error);
    }
  }
  
  return {
    headers: {
      ...headers,
      ...(token && { authorization: `Bearer ${token}` }),
    },
  };
});

// Create Apollo Client
export const apolloClient = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
  cache: new InMemoryCache({
    typePolicies: {
      Participant: {
        keyFields: ['id'],
      },
      Session: {
        keyFields: ['id'],
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
    },
    query: {
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

