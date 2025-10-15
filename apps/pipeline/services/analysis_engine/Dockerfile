FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY apps/pipeline/services/analysis_engine/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY apps/pipeline/libs/ ./libs/
COPY apps/pipeline/services/analysis_engine/ ./services/analysis_engine/

# Set environment variables
ENV PYTHONPATH=/app
ENV SERVICE_NAME=analysis-engine

# Expose port
EXPOSE 8002

# Run the service
CMD ["python", "-m", "services.analysis_engine.main"]
