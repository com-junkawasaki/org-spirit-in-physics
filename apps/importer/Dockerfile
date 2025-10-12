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

# Expose port 8001 for the importer API
EXPOSE 8001

# Start the importer worker
CMD ["python", "-m", "src.run_worker"]
