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

# Copy paper app source code
COPY . ./

# Create symlinks for .mdx files as .md files for Astro content collections
# This is a workaround for Astro's content collection loader only matching .md files
RUN cd src/content/papers && \
    for file in *.mdx; do \
      if [ -f "$file" ] && [ ! -f "${file%.mdx}.md" ]; then \
        ln -sf "$file" "${file%.mdx}.md"; \
      fi; \
    done

# Set hostname and port to bind to all interfaces
ENV HOSTNAME=0.0.0.0
ENV PORT=4321

# Expose port 4321
EXPOSE 4321

# Start the application
CMD ["pnpm", "dev"]

