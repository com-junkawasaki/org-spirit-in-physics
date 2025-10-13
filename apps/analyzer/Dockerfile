# Use Python 3.11 slim as base image (better for scientific packages)
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY apps/analyzer/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy environment file
COPY apps/analyzer/env.docker .env

# Copy packages from project root
COPY packages /app/packages

# Copy analyzer source code
COPY apps/analyzer .

# Create startup script to generate config.yaml from environment variables
RUN echo '#!/bin/bash' > /app/start.sh && \
    echo 'cat > config.yaml << EOF' >> /app/start.sh && \
    echo 'arangodb:' >> /app/start.sh && \
    echo '  url: "$ARANGODB_URL"' >> /app/start.sh && \
    echo '  user: "$ARANGODB_USER"' >> /app/start.sh && \
    echo '  password: "$ARANGODB_PASSWORD"' >> /app/start.sh && \
    echo '  database: "$ARANGODB_DATABASE"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'hume_ai:' >> /app/start.sh && \
    echo '  api_key: "$HUME_API_KEY"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'model_params:' >> /app/start.sh && \
    echo '  alpha: $ALPHA' >> /app/start.sh && \
    echo '  gamma: $GAMMA' >> /app/start.sh && \
    echo '  eta: $ETA' >> /app/start.sh && \
    echo '  lambda: $LAMBDA' >> /app/start.sh && \
    echo '  epsilon: $EPSILON' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'word2vec:' >> /app/start.sh && \
    echo '  model_path: "$WORD2VEC_MODEL_PATH"' >> /app/start.sh && \
    echo '' >> /app/start.sh && \
    echo 'processing:' >> /app/start.sh && \
    echo '  max_concurrent_jobs: $MAX_CONCURRENT_JOBS' >> /app/start.sh && \
    echo '  job_timeout_seconds: $JOB_TIMEOUT_SECONDS' >> /app/start.sh && \
    echo '  temp_dir: "$TEMP_DIR"' >> /app/start.sh && \
    echo 'EOF' >> /app/start.sh && \
    echo 'python src/api_server.py' >> /app/start.sh && \
    chmod +x /app/start.sh

# Expose port 8000 for the API server
EXPOSE 8000

# Start the API server
CMD ["/app/start.sh"]
