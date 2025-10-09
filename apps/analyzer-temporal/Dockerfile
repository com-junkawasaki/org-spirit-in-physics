# Dockerfile for analyzer-temporal
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Create directories for results and visualizations
RUN mkdir -p results visualizations

# Expose port for API server
EXPOSE 8081

# Default command (can be overridden in docker-compose)
CMD ["python", "api_server.py", "--host", "0.0.0.0", "--port", "8081"]
