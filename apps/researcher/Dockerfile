# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages
COPY packages/ ./packages/

# Copy researcher app files
COPY apps/researcher/package.json ./apps/researcher/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies (workspace-aware)
RUN pnpm install --no-frozen-lockfile

# Copy researcher app source code
COPY apps/researcher/ ./apps/researcher/

# Copy environment file
COPY apps/researcher/env.docker ./apps/researcher/.env.local

# Change to researcher directory
WORKDIR /app/apps/researcher

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start the application with explicit hostname and port binding
CMD ["pnpm", "dev"]
