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
COPY apps/importer/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install hume==0.12.1
RUN python -c "import hume; print('Hume AI SDK version:', hume.__version__)"

# Copy environment file
COPY apps/importer/env.docker .env

# Copy source code
COPY apps/importer/ .
# Copy apps directory structure for imports
COPY apps/ /app/apps/
# Copy packages directory for shared modules
COPY packages/ /app/packages/

# Expose port 8001 for the importer API
EXPOSE 8001

# Start the importer worker
CMD ["python", "-m", "src.run_worker"]
