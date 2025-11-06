//! GraphQL Client Factory Hook
//! 
//! Merkle DAG: components.hooks.graphql_client
//! OWL: spirit:GraphQL Service Port client factory

import { ApolloClient, NormalizedCacheObject } from '@apollo/client';

/**
 * GraphQLクライアント作成ヘルパー
 * Apollo Clientを返すファクトリー関数型
 */
export type GraphQLClientFactory = () => ApolloClient<NormalizedCacheObject>;

/**
 * GraphQLクライアントファクトリーを作成
 * デフォルトではApollo Clientを使用
 */
export function createGraphQLClientFactory(
  config: { url?: string } = {}
): GraphQLClientFactory {
  const { url = typeof window !== 'undefined' 
    ? `${window.location.protocol}//${window.location.hostname}:3003/graphql`
    : 'http://localhost:3003/graphql' } = config;
  
  // This will be set by the app that uses this component
  // For now, return a factory that throws if not set
  return () => {
    throw new Error('GraphQL client factory not set. Please set it using setGraphQLClientFactory.');
  };
}

