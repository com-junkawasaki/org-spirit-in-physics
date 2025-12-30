FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --no-frozen-lockfile
COPY . .
# Force rebuild v14
RUN echo "build-v14" > build-version.txt
ENV POSTHOG_DISABLED=1
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
# Install python3 for env replacement
RUN apk add --no-cache python3
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --prod --no-frozen-lockfile
COPY --from=builder /app/build /app/build
COPY replace-env.py /app/replace-env.py

EXPOSE 80
ENV PORT=80
ENV NODE_ENV=production

# Run env replacement, then start sirv server in SPA mode
CMD ["/bin/sh", "-c", "python3 /app/replace-env.py /app/build && ./node_modules/.bin/sirv build --port 80 --single --host 0.0.0.0"]
