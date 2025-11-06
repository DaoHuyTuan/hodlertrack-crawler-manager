# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code (includes drizzle.config.ts and drizzle/ folder)
COPY . .

# Expose port
EXPOSE 3000

# Start the application in development mode
CMD ["yarn", "dev"]
