FROM node:24-alpine

WORKDIR /app/backend

# Install system dependencies including minimal LaTeX
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    texlive \
    texlive-luatex \
    texlive-xetex \
    py3-pygments \
    zip \
    unzip \
    && rm -rf /var/cache/apk/*

# Tell Puppeteer to skip installing Chromium. We'll be using the installed package.
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

COPY backend/package.json ./package.json
COPY backend/.npmrc ./.npmrc
COPY backend/prisma ./prisma/
COPY backend/tsconfig.json ./tsconfig.json
COPY backend/src ./src

# Install backend dependencies
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 4000
CMD ["npm", "start"]

