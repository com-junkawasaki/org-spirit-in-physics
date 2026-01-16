# syntax=docker/dockerfile:1
FROM node:20-slim AS builder
WORKDIR /app
RUN npm install -g pnpm@10.26.2

# Use cache mount for pnpm store to speed up install
COPY noop-posthog ./noop-posthog
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile

COPY . .
# Force rebuild v18
RUN echo "build-v18" > build-version.txt

# Use cache mount for svelte-kit to speed up build
# RUN --mount=type=cache,id=svelte-kit,target=/app/.svelte-kit pnpm build
RUN pnpm build

FROM node:20-slim
WORKDIR /app
# Install python3 for env replacement
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.26.2

# Use cache mount for pnpm store in prod install too
COPY noop-posthog ./noop-posthog
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --no-frozen-lockfile

COPY --from=builder /app/build /app/build
COPY replace-env.py /app/replace-env.py

EXPOSE 80
ENV PORT=80
ENV NODE_ENV=production

# Run env replacement, then start sirv server in SPA mode with spa.html as fallback
# Using /app/build explicitly to avoid any path issues
CMD ["/bin/sh", "-c", "python3 /app/replace-env.py /app/build && ./node_modules/.bin/sirv /app/build --port 80 --single spa.html --host 0.0.0.0"]
