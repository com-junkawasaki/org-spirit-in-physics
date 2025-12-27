FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM envoyproxy/envoy:v1.31-latest
WORKDIR /app
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/build /app/www
COPY envoy.yaml /etc/envoy/envoy.yaml
COPY replace-env.sh /app/replace-env.sh
RUN chmod +x /app/replace-env.sh

# Simple Python script to handle SPA fallback
RUN echo "import http.server, socketserver, os; \
PORT = 8080; \
DIRECTORY = '/app/www'; \
class Handler(http.server.SimpleHTTPRequestHandler): \
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=DIRECTORY, **kwargs); \
    def do_GET(self): \
        path = self.translate_path(self.path); \
        if not os.path.exists(path) and '.' not in os.path.basename(path): self.path = '/index.html'; \
        return super().do_GET(); \
with socketserver.TCPServer(('', PORT), Handler) as httpd: httpd.serve_forever()" > /app/spa_server.py

# Run env replacement, then start python SPA server and envoy
CMD ["/bin/sh", "-c", "/app/replace-env.sh && python3 /app/spa_server.py & envoy -c /etc/envoy/envoy.yaml"]
