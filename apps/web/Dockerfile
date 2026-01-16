# syntax=docker/dockerfile:1
FROM node:20-slim AS builder
WORKDIR /app
RUN npm install -g pnpm@10.26.2

# Copy package files for dependency caching
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --no-frozen-lockfile

# Copy everything else and build
COPY . .
RUN pnpm build

FROM node:20-slim
WORKDIR /app
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*
RUN npm install -g pnpm@10.26.2

# Copy package files and install production dependencies
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --no-frozen-lockfile

# Copy built files and scripts
COPY --from=builder /app/build ./build
COPY replace-env.py ./

EXPOSE 80
ENV PORT=80
ENV NODE_ENV=production

CMD ["/bin/sh", "-c", "python3 replace-env.py build && ./node_modules/.bin/sirv build --port 80 --single spa.html --host 0.0.0.0"]
