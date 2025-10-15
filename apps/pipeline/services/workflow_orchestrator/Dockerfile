FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY apps/pipeline/services/workflow_orchestrator/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY apps/pipeline/libs/ ./libs/
COPY apps/pipeline/services/workflow_orchestrator/ ./services/workflow_orchestrator/

# Set environment variables
ENV PYTHONPATH=/app
ENV SERVICE_NAME=workflow-orchestrator

# Expose port
EXPOSE 8003

# Run the service
CMD ["python", "-m", "services.workflow_orchestrator.main"]
