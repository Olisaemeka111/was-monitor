# Use Node.js as base image
FROM node:18-alpine

# Install required system dependencies
RUN apk add --no-cache \
    aws-cli \
    jq \
    bash \
    bc \
    curl

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Create directory for temporary AWS credentials
RUN mkdir -p .aws-temp && chmod 700 .aws-temp

# Make shell script executable
RUN chmod +x aws_service_checker.sh

# Build the application
RUN npm run build

# Expose port
EXPOSE 4000

# Set environment variables
ENV PORT=4000
ENV NODE_ENV=production

# Start the application
CMD ["npm", "start"]
