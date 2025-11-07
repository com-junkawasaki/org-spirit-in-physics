# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy workspace configuration first
COPY pnpm-workspace.yaml ./

# Copy the entire monorepo source code into the image.
# This ensures that all workspace packages and shared files are available.
COPY . .

# Install dependencies from the workspace root
# pnpm will resolve workspace dependencies automatically
RUN pnpm install --no-frozen-lockfile

# Set the final working directory to the specific app's folder
WORKDIR /app/apps/researcher

# Note: env.docker is already copied by COPY . . above
# If needed, it can be accessed at /app/apps/researcher/env.docker

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start the application
# Run from the app directory to ensure correct path resolution for tsconfig.json
CMD ["sh", "-c", "cd /app/apps/researcher && pnpm dev"]
