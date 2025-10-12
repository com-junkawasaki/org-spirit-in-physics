# Use Python 3.11 Alpine as base image
FROM python:3.11-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    gcc \
    musl-dev \
    libffi-dev \
    openssl-dev \
    curl

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create non-root user
RUN adduser -D appuser && chown -R appuser:appuser /app
USER appuser

# Expose port 8000
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Default command (can be overridden)
CMD ["python", "src/api_server.py", "--host", "0.0.0.0", "--port", "8000"]
