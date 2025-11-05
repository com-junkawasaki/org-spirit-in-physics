//! Apollo Provider Wrapper
//! 
//! Merkle DAG: graphql.providers
//! OWL: spirit:GraphQL Service Port provider

'use client';

import { ApolloProvider } from '@apollo/client/react';
import { apolloClient } from '@/lib/graphql/client';

export function GraphQLProvider({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apolloClient}>{children}</ApolloProvider>;
}

