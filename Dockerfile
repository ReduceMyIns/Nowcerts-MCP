FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm install --save-dev typescript @types/node @types/express && \
    npm run build && \
    npm uninstall typescript @types/node @types/express

# Remove source files, keep only dist
RUN rm -rf src tsconfig.json

# Create logs directory
RUN mkdir -p /app/logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Set environment variables
ENV NODE_ENV=production
ENV USE_SSE=true
ENV PORT=3000

# Start the server
CMD ["node", "dist/index.js"]
