FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY apps/pipeline/services/data_ingestion/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY apps/pipeline/libs/ ./libs/
COPY apps/pipeline/services/data_ingestion/ ./services/data_ingestion/

# Set environment variables
ENV PYTHONPATH=/app
ENV SERVICE_NAME=data-ingestion

# Expose port
EXPOSE 8001

# Run the service
CMD ["python", "-m", "services.data_ingestion.main"]
