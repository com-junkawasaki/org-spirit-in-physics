# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 5173 (Vite default)
EXPOSE 5173

# Start the application in development mode
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
