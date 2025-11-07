import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

let client: ApolloClient<any> | null = null;

export const getApolloClient = () => {
  if (!client || typeof window === 'undefined') {
    client = new ApolloClient({
      link: new HttpLink({
        uri: process.env.NEXT_PUBLIC_GRAPHQL_RUST_API_URL || 'http://localhost:8080/graphql',
        fetchOptions: {
          mode: 'cors',
        },
      }),
      cache: new InMemoryCache(),
    });
  }
  return client;
};

export const apolloClient = getApolloClient();
