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
    postgresql-dev \
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

# Default command (scripts will specify their own commands)
CMD ["python", "--version"]
