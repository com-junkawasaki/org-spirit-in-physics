import createMDX from '@next/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Resolve package paths
const jungVoiceAssessmentPath = resolve(
  __dirname,
  '../../packages/jung-voice-assessment/src/index.ts'
);
const visualizationComponentsPath = resolve(
  __dirname,
  '../../packages/visualization-components/src/index.ts'
);
const grpcClientPath = resolve(
  __dirname,
  '../../packages/grpc-client/src/index.ts'
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable MDX
  pageExtensions: ['ts', 'tsx', 'js', 'jsx', 'md', 'mdx'],
  
  // Webpack configuration for package aliases
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': resolve(__dirname, './src'),
      '@/': resolve(__dirname, './src/'),
      '@spirit-in-physics/jung-voice-assessment': jungVoiceAssessmentPath,
      '@spirit-in-physics/visualization-components': visualizationComponentsPath,
      '@spirit-in-physics/grpc-client': grpcClientPath,
    };

    // Resolve modules from unified app's node_modules for workspace packages
    config.resolve.modules = [
      ...(config.resolve.modules || []),
      resolve(__dirname, './node_modules'),
    ];

    // Resolve .js imports to .ts files when they exist (for generated protobuf files)
    // Prioritize .ts extensions before .js
    const originalExtensions = config.resolve.extensions || ['.js', '.json'];
    config.resolve.extensions = ['.ts', '.tsx', ...originalExtensions];
    
    // Also add extensionAlias as fallback
    config.resolve.extensionAlias = {
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.jsx': ['.tsx', '.jsx'],
    };

    // Exclude these packages from optimization
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    // Handle .jsonld files with ?raw query as raw text
    config.module.rules.push({
      test: /\.jsonld$/,
      resourceQuery: /raw/,
      type: 'asset/source',
    });

    return config;
  },

  // Experimental features
  experimental: {
    mdxRs: false, // Use JavaScript MDX compiler for now
  },
};

const withMDX = createMDX({
  options: {
    remarkPlugins: [remarkMath, remarkGfm],
    rehypePlugins: [rehypeKatex],
  },
});

export default withMDX(nextConfig);
