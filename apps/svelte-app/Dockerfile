FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --frozen-lockfile
COPY --from=builder /app/build /app/build
COPY replace-env.sh /app/replace-env.sh
RUN chmod +x /app/replace-env.sh

EXPOSE 80
ENV PORT=80
ENV NODE_ENV=production

# Run env replacement, then start sirv server in SPA mode
CMD ["/bin/sh", "-c", "/app/replace-env.sh /app/build && ./node_modules/.bin/sirv build --port 80 --single --host 0.0.0.0"]
