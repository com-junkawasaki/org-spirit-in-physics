FROM node:20-alpine
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* ./
RUN npm -g install pnpm && pnpm install --prod --no-frozen-lockfile
COPY . .
CMD ["node", "index.js"]


