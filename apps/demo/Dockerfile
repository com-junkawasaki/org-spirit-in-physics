# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy common visualization-components package first
COPY packages/visualization-components ./packages/visualization-components

# Copy demo app package files
COPY apps/demo/package.json apps/demo/pnpm-lock.yaml* ./

# Fix the file: reference in package.json to match the container path
RUN sed -i.bak 's|file:../../packages/visualization-components|file:./packages/visualization-components|g' package.json && rm package.json.bak

# Install dependencies and wget for healthcheck
RUN pnpm install --no-frozen-lockfile && \
    apk add --no-cache wget

# Copy demo app source code
COPY apps/demo ./

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=4322

# Expose port 4322
EXPOSE 4322

# Start the application
CMD ["pnpm", "dev"]

