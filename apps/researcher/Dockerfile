# syntax=docker/dockerfile:1
FROM node:20-slim AS builder
WORKDIR /app
RUN npm install -g pnpm@10.26.2

# Copy workspace files for monorepo
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY pkg ./pkg
COPY apps/researcher ./apps/researcher

# Install dependencies
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile

# Build the researcher app
WORKDIR /app/apps/researcher
RUN pnpm build

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

# Install only sirv-cli for serving the SPA
RUN npm install -g sirv-cli@3.0.1

# Copy built files and scripts
COPY --from=builder /app/apps/researcher/build ./build
COPY apps/researcher/replace-env.py ./

EXPOSE 80
ENV PORT=80
ENV NODE_ENV=production

CMD ["/bin/sh", "-c", "python3 replace-env.py build && sirv build --port 80 --single spa.html --host 0.0.0.0"]
