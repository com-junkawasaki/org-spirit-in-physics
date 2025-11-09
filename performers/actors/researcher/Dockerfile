# Use Node.js 20 Alpine as base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Install wget, curl, and docker CLI for admin API
RUN apk add --no-cache wget curl docker-cli

# Copy package files
COPY package.json pnpm-lock.yaml* ./

# Install dependencies
RUN pnpm install --no-frozen-lockfile

# Copy source code
COPY . .

# Copy entrypoint script and make it executable
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && ls -la /entrypoint.sh

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Use entrypoint script
ENTRYPOINT ["/entrypoint.sh"]
# Start the application
CMD ["pnpm", "dev"]
