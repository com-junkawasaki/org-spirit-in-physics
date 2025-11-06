import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL 
    ? `${process.env.NEXT_PUBLIC_RUST_GRAPHQL_URL}/graphql`
    : 'http://localhost:3003/graphql',
  documents: './src/lib/graphql/**/*.{ts,tsx}',
  generates: {
    './src/lib/graphql/generated/types.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-react-apollo',
      ],
      config: {
        scalars: {
          JSON: 'any',
        },
        apolloClientVersion: 4,
        reactApolloVersion: 4,
        withHooks: true,
        withComponent: false,
        withHOC: false,
      },
    },
  },
};

export default config;

