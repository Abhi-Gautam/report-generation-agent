FROM node:24-alpine

WORKDIR /app/backend

# Install system dependencies including basic LaTeX (only packages that exist in Alpine)
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    texlive-full \
    py3-pygments \
    zip \
    unzip \
    && rm -rf /var/cache/apk/*


# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

# Copy package files first for dependency caching
COPY backend/package.json ./package.json
COPY backend/.npmrc ./.npmrc

# Install backend dependencies (this will be cached if package.json unchanged)
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy prisma schema and generate client
COPY backend/prisma ./prisma/
RUN npx prisma generate

# Copy source code and config (this will invalidate cache when source changes)
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src

# Build the application (will run every time src changes)
RUN npm run build

# Create user and change ownership only after all build steps are complete
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001 && \
    chown -R nextjs:nodejs /app/backend
USER nextjs

EXPOSE 4000
CMD ["npm", "start"]

