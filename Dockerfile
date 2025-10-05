# Multi-stage build for optimized Google Cloud Run deployment
FROM node:22-slim AS base

# Install system dependencies needed for Playwright and PostgreSQL client
RUN apt-get update && \
    apt-get install -y \
    wget \
    curl \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libxss1 \
    libgconf-2-4 \
    postgresql-client \
    --no-install-recommends && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for build process)
RUN npm install && npm cache clean --force

# Copy application code
COPY . .

# Copy and set entrypoint script permissions
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Create necessary directories
RUN mkdir -p public/reports public/styles public/scripts

# Build CSS assets
RUN npm run sass:build

# Install Playwright system dependencies (as root)
RUN npx playwright install-deps chromium

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app && \
    chmod -R 755 /app

# Switch to app user and install browser binary
USER app
RUN npx playwright install chromium

# Don't prune devDependencies - we need sequelize-cli for migrations
# RUN npm prune --production

# Expose port (Cloud Run will override this)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

# Set entrypoint and default command
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["npm", "run", "serve"]