FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM nginx:alpine
COPY --from=builder /app/build /usr/share/nginx/html
# For CSR support in NGINX
RUN echo 'server {     listen 80;     location / {         root /usr/share/nginx/html;         index index.html;         try_files $uri $uri/ /index.html;     } }' > /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
