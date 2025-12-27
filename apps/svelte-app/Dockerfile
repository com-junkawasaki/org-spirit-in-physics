FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /app/build /app/www
RUN chmod -R 777 /app/www
COPY replace-env.sh /app/replace-env.sh
RUN chmod +x /app/replace-env.sh

# Simple Python script to handle SPA fallback with better logging
RUN echo "import http.server, socketserver, os, sys; \
PORT = 80; \
DIRECTORY = '/app/www'; \
class Handler(http.server.SimpleHTTPRequestHandler): \
    def __init__(self, *args, **kwargs): super().__init__(*args, directory=DIRECTORY, **kwargs); \
    def do_GET(self): \
        actual_path = self.translate_path(self.path); \
        if not os.path.exists(actual_path) and '.' not in os.path.basename(actual_path): \
            print(f'SPA Fallback: {self.path} -> /index.html', file=sys.stderr); \
            self.path = '/index.html'; \
        return super().do_GET(); \
print(f'Serving SPA on port {PORT} from {DIRECTORY}', file=sys.stderr); \
with socketserver.TCPServer(('', PORT), Handler) as httpd: httpd.serve_forever()" > /app/spa_server.py

# Run env replacement, then start python SPA server
CMD ["/bin/sh", "-c", "/app/replace-env.sh && python3 /app/spa_server.py"]
