FROM node:24-alpine

WORKDIR /app

# Copy package files
COPY frontend/package.json ./package.json
COPY frontend/.npmrc ./.npmrc

# Install dependencies
RUN npm install --legacy-peer-deps --no-audit --no-fund

# Copy the rest of the source code
COPY frontend/src ./src
COPY frontend/public ./public
COPY frontend/next.config.js ./next.config.js
COPY frontend/tailwind.config.js ./tailwind.config.js
COPY frontend/tsconfig.json ./tsconfig.json
COPY frontend/postcss.config.js ./postcss.config.js

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001
RUN chown -R nextjs:nodejs /app
USER nextjs

EXPOSE 3000

# Default command
CMD ["npm", "run", "dev"]
