# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy environment file
COPY env.docker .env.local

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Expose port 25260
EXPOSE 25260

# Start the application
CMD ["pnpm", "start"]
