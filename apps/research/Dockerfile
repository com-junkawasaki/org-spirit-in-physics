# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies and wget for healthcheck
RUN pnpm install --no-frozen-lockfile && \
    apk add --no-cache wget

# Copy source code
COPY . .

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=4321

# Expose port 4321
EXPOSE 4321

# Start the application
CMD ["pnpm", "dev"]

