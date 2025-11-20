# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace root package.json and pnpm-workspace.yaml if exists
COPY package.json* pnpm-workspace.yaml* ./

# Copy common visualization-components package
COPY packages/visualization-components ./packages/visualization-components

# Copy researcher app package files
COPY apps/researcher/package.json apps/researcher/pnpm-lock.yaml* ./

# Fix the file: reference in package.json to match the container path
RUN sed -i 's|file:../../packages/visualization-components|file:./packages/visualization-components|g' package.json

# Install dependencies and wget for healthcheck
RUN pnpm install --no-frozen-lockfile && \
    apk add --no-cache wget

# Copy environment file
COPY apps/researcher/env.docker .env.local

# Copy source code (exclude large dataset directory)
COPY apps/researcher ./
# Remove large dataset directory if it was copied (it should be excluded by .dockerignore, but ensure it)
RUN rm -rf public/dataset || true

# Ensure packages directory is preserved
COPY packages/visualization-components ./packages/visualization-components

# Build the application
# RUN pnpm build

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start the application with explicit hostname and port binding
CMD ["pnpm", "dev"]
