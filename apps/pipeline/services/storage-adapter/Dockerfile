FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY libs/ ./libs/
COPY services/storage-adapter/ ./services/storage-adapter/

# Set environment variables
ENV PYTHONPATH=/app
ENV SERVICE_NAME=storage-adapter

# Expose port
EXPOSE 8004

# Run the service
CMD ["python", "-m", "services.storage-adapter.main"]
