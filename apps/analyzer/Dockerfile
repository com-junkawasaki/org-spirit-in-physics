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
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy environment file
COPY env.docker .env

# Copy source code
COPY . .

# Create config.yaml from environment variables
RUN echo "arangodb:" > config.yaml && \
    echo "  url: \"$ARANGODB_URL\"" >> config.yaml && \
    echo "  user: \"$ARANGODB_USER\"" >> config.yaml && \
    echo "  password: \"$ARANGODB_PASSWORD\"" >> config.yaml && \
    echo "  database_name: \"$DATABASE_NAME\"" >> config.yaml && \
    echo "" >> config.yaml && \
    echo "supabase:" >> config.yaml && \
    echo "  url: \"$SUPABASE_URL\"" >> config.yaml && \
    echo "  service_role_key: \"$SUPABASE_SERVICE_ROLE_KEY\"" >> config.yaml && \
    echo "" >> config.yaml && \
    echo "hume_ai:" >> config.yaml && \
    echo "  api_key: \"$HUME_API_KEY\"" >> config.yaml && \
    echo "" >> config.yaml && \
    echo "model_params:" >> config.yaml && \
    echo "  alpha: $ALPHA" >> config.yaml && \
    echo "  gamma: $GAMMA" >> config.yaml && \
    echo "  eta: $ETA" >> config.yaml && \
    echo "  lambda: $LAMBDA" >> config.yaml && \
    echo "  epsilon: $EPSILON" >> config.yaml && \
    echo "" >> config.yaml && \
    echo "word2vec:" >> config.yaml && \
    echo "  model_path: \"$WORD2VEC_MODEL_PATH\"" >> config.yaml && \
    echo "" >> config.yaml && \
    echo "processing:" >> config.yaml && \
    echo "  max_concurrent_jobs: $MAX_CONCURRENT_JOBS" >> config.yaml && \
    echo "  job_timeout_seconds: $JOB_TIMEOUT_SECONDS" >> config.yaml && \
    echo "  temp_dir: \"$TEMP_DIR\"" >> config.yaml

# Expose port 8000 for the API server
EXPOSE 8000

# Start the API server
CMD ["python", "src/api_server.py"]
