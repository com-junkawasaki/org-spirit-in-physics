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
COPY services/api-gateway/ ./services/api-gateway/

# Set environment variables
ENV PYTHONPATH=/app
ENV SERVICE_NAME=api-gateway

# Expose port
EXPOSE 8000

# Run the service
CMD ["python", "-m", "services.api-gateway.main"]
