FROM node:20-bookworm
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
# Need build dependencies for native modules
RUN apt-get update && apt-get install -y python3 make g++ curl
RUN pnpm install --frozen-lockfile

# Install Playwright and browsers for BDD tests
RUN npx playwright install --with-deps chromium

COPY . .
RUN pnpm build

ENV APP_PORT=3002
ENV DAPR_HTTP_PORT=3500

CMD ["node", "dist/worker.js"]
