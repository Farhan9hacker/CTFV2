# Multi-stage Dockerfile for Operation Black Beacon CTF
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production || npm install --production

# Copy application files
COPY . .

# Run CTF security audit & build pipeline
RUN node build.js

# Production Stage
FROM node:18-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy built application from builder stage
COPY --from=builder /app /app

# Run application as non-root user for security isolation
USER node

EXPOSE 3000

CMD ["npm", "start"]
