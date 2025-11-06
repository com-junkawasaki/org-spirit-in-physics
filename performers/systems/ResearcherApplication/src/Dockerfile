# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy workspace root files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Copy workspace packages
COPY performers/services/ports/types/ ./performers/services/ports/types/

# Copy researcher app files
COPY performers/systems/ResearcherApplication/src/package.json ./performers/systems/ResearcherApplication/src/

# Install pnpm
RUN npm install -g pnpm

# Install dependencies (workspace-aware)
RUN pnpm install --no-frozen-lockfile

# Copy researcher app source code
COPY performers/systems/ResearcherApplication/src/ ./performers/systems/ResearcherApplication/src/

# Copy environment file
COPY performers/systems/ResearcherApplication/src/env.docker ./performers/systems/ResearcherApplication/src/.env.local

# Change to researcher directory
WORKDIR /app/performers/systems/ResearcherApplication/src

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start the application with explicit hostname and port binding
CMD ["pnpm", "dev"]
