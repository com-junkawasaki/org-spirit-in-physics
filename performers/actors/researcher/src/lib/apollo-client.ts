import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

let client: ApolloClient<any> | null = null;

export const getApolloClient = () => {
  if (!client || typeof window === 'undefined') {
    // For server-side rendering, use internal Docker network URL
    // For client-side, use NEXT_PUBLIC_GRAPHQL_RUST_API_URL
    const isServer = typeof window === 'undefined';
    const serverUrl = process.env.GRAPHQL_RUST_API_URL || 'http://graphql:8080/graphql';
    const clientUrl = process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql';
    const uri = isServer ? serverUrl : clientUrl;
    
    client = new ApolloClient({
      link: new HttpLink({
        uri,
        fetchOptions: {
          mode: 'cors',
        },
      }),
      cache: new InMemoryCache(),
      ssrMode: isServer,
    });
  }
  return client;
};

export const apolloClient = getApolloClient();
