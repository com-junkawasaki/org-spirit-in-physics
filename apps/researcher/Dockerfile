# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy dependency definition files from the monorepo root
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

# Install all dependencies. In a monorepo, it's often necessary to install
# dependencies from the root to correctly link workspace packages.
RUN pnpm install --no-frozen-lockfile

# Copy the entire monorepo source code into the image.
# This ensures that all workspace packages and shared files are available.
COPY . .

# Set the final working directory to the specific app's folder
WORKDIR /app/apps/researcher

# Copy environment file into the app's folder
COPY ./env.docker ./.env.local

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["pnpm", "dev"]
