# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy common visualization-components package first
COPY packages/visualization-components ./packages/visualization-components

# Copy research app package files
COPY apps/research/package.json apps/research/pnpm-lock.yaml* ./

# Fix the file: reference in package.json to match the container path
RUN sed -i.bak 's|file:../../packages/visualization-components|file:./packages/visualization-components|g' package.json && rm package.json.bak

# Install dependencies and wget for healthcheck
RUN pnpm install --no-frozen-lockfile && \
    apk add --no-cache wget

# Copy research app source code
COPY apps/research ./

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=4321

# Expose port 4321
EXPOSE 4321

# Start the application
CMD ["pnpm", "dev"]


CMD ["pnpm", "dev"]

