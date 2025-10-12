# Use Python 3.11 Alpine as base image
FROM python:3.11-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache gcc g++ musl-dev linux-headers

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
CMD ["python", "src/run_worker.py"]
