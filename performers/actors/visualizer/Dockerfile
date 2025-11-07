# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy all files
COPY . .

# Configure pnpm store
RUN pnpm config set store-dir /app/.pnpm-store

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Set pnpm store environment variable for runtime
ENV PNPM_HOME=/usr/local/bin
ENV PNPM_STORE_PATH=/app/.pnpm-store

# Install wget and curl for health checks
RUN apk add --no-cache wget curl

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
# Start the application
CMD ["pnpm", "dev"]
