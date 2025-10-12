# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install

# Copy environment file
COPY env.docker .env

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Expose port 4173 (Vite preview port)
EXPOSE 4173

# Start the application in preview mode
CMD ["npm", "run", "preview", "--", "--host", "0.0.0.0", "--port", "4173"]
