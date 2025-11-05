import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  overwrite: true,
  schema: './src/app/graphql/schema.graphql',
  documents: './src/lib/graphql/**/*.{ts,tsx}',
  generates: {
    './src/lib/graphql/generated/types.ts': {
      plugins: ['typescript', 'typescript-operations', 'typescript-react-apollo'],
      config: {
        scalars: {
          JSON: 'any',
        },
        withHooks: true,
        withComponent: false,
        withHOC: false,
        apolloClientVersion: 3,
        reactApolloVersion: 3,
      },
    },
  },
};

export default config;

