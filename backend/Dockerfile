# ==============================================================================
# Warehouse Receiving System - Backend Dockerfile
# Multi-stage build for Node.js Express + TypeScript
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies needed for compiling
COPY package*.json ./
RUN npm ci

# Copy TypeScript configuration and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Compile TypeScript to JavaScript
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Production runner stage
# ------------------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Install only production dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled JavaScript output from builder stage
COPY --from=builder /app/dist ./dist

# Expose backend REST API port
EXPOSE 5000

# Execute database migrations, seeds, then launch the Express server
CMD ["sh", "-c", "node dist/db/migrate.js && node dist/db/seed.js && node dist/index.js"]
