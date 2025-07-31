# Use Node.js 18 Alpine for smaller image size
# Using latest LTS version with security patches
FROM node:18-alpine3.20 AS base

# Install dependencies for Playwright and Tesseract
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    freetype-dev \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    tesseract-ocr \
    tesseract-ocr-data-eng

# Tell Playwright to use installed Chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
FROM base AS deps
RUN npm ci --only=production

# Install all dependencies for building
FROM base AS build
RUN npm ci
COPY . .
RUN npm run build

# Production image
FROM base AS production

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001

# Copy production dependencies
COPY --from=deps --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copy built application
COPY --from=build --chown=nodejs:nodejs /app/dist ./dist
COPY --chown=nodejs:nodejs package*.json ./

# Copy data directory (if needed)
COPY --chown=nodejs:nodejs data ./data

# Create necessary directories
RUN mkdir -p logs output .temp && chown -R nodejs:nodejs logs output .temp

# Switch to non-root user
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Healthy')" || exit 1

# Set production environment
ENV NODE_ENV=production

# Default command
CMD ["node", "dist/scrape.js"]