# ==============================================================================
# Warehouse Receiving System - Frontend Dockerfile
# Multi-stage build for React 19 + Vite + Tailwind CSS -> Nginx Alpine
# ==============================================================================

# ------------------------------------------------------------------------------
# Stage 1: Build static assets
# ------------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# Install project dependencies
COPY package*.json ./
RUN npm ci

# Copy configuration and source files
COPY index.html ./
COPY tsconfig*.json ./
COPY vite.config.ts ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY public/ ./public/
COPY src/ ./src/

# Compile production bundle
RUN npm run build

# ------------------------------------------------------------------------------
# Stage 2: Serve static assets with Nginx
# ------------------------------------------------------------------------------
FROM nginx:alpine AS runner

# Clean up default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built artifacts from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose HTTP port 80
EXPOSE 80

# Run Nginx in foreground
CMD ["nginx", "-g", "daemon off;"]
