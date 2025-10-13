# Use Python 3.11 slim as base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY apps/pipeline/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy environment file
COPY apps/pipeline/env.docker .env

# Copy source code
COPY apps/pipeline/src /app/src
COPY packages/ /app/packages/

# Expose port 8000 for the API server
EXPOSE 8000

# Start the pipeline worker
CMD ["python", "-m", "src.run_worker"]
