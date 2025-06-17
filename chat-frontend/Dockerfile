# Build stage
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm i

# Copy source code
COPY . .

EXPOSE 3000
# Build the application for production
CMD ["npm", "run", "dev"]

# Production stage 