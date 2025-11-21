# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy app package files
COPY package.json pnpm-lock.yaml* ./

# Copy common visualization-components package
COPY packages/visualization-components ./packages/visualization-components

# Fix the file: reference in package.json to match the container path
RUN sed -i.bak 's|file:../../packages/visualization-components|file:./packages/visualization-components|g' package.json && rm package.json.bak

# Install dependencies and wget for healthcheck
RUN pnpm install --no-frozen-lockfile && \
    apk add --no-cache wget

# Copy demo app source code (exclude large audio directory)
COPY . ./
# Remove large audio directory if it was copied (it should be excluded by .dockerignore, but ensure it)
RUN rm -rf public/audio || true

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=4322

# Expose port 4322
EXPOSE 4322

# Create entrypoint script to fix package.json path and install dependencies
RUN echo '#!/bin/sh' > /usr/local/bin/docker-entrypoint.sh && \
    echo 'set -e' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'cd /app' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'if [ -f package.json ]; then' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  sed -i.bak "s|file:../../packages/visualization-components|file:./packages/visualization-components|g" package.json && rm -f package.json.bak' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'if [ ! -d node_modules ] || [ ! -f node_modules/.pnpm-lock.yaml ]; then' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  echo "Installing dependencies..."' >> /usr/local/bin/docker-entrypoint.sh && \
    echo '  CI=true pnpm install --no-frozen-lockfile --force' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'fi' >> /usr/local/bin/docker-entrypoint.sh && \
    echo 'exec "$@"' >> /usr/local/bin/docker-entrypoint.sh && \
    chmod +x /usr/local/bin/docker-entrypoint.sh

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# Start the application
CMD ["pnpm", "dev"]

