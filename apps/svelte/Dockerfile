FROM node:20-alpine AS builder

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/svelte/package.json ./apps/svelte/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
WORKDIR /app/apps/svelte
RUN pnpm build

FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml* ./
COPY apps/svelte/package.json ./apps/svelte/

# Install production dependencies
RUN pnpm install --prod --frozen-lockfile

# Copy built application
COPY --from=builder /app/apps/svelte/build ./apps/svelte/build
COPY --from=builder /app/apps/svelte/package.json ./apps/svelte/

WORKDIR /app/apps/svelte

EXPOSE 3000

CMD ["node", "build"]
