FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
RUN echo 'server {     listen 80;     location / {         root /usr/share/nginx/html;         index index.html;         try_files $uri $uri/ /index.html;     } }' > /etc/nginx/conf.d/default.conf

# Copy the script and ensure it's in docker-entrypoint.d
COPY replace-env.sh /docker-entrypoint.d/40-replace-env.sh
RUN chmod +x /docker-entrypoint.d/40-replace-env.sh

EXPOSE 80
