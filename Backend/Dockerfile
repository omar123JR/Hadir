# Build Stage
FROM node:20-alpine AS build

# Use non-root user
USER node
WORKDIR /home/node/app

# Copy dependency definitions
COPY --chown=node:node package*.json ./
COPY --chown=node:node tsconfig.json ./

# Install dependencies (including devDependencies for build)
RUN npm ci

# Copy application source
COPY --chown=node:node src ./src

# Build the application
RUN npm run build

# Production Stage
FROM node:20-alpine AS production

# Set Node environment
ENV NODE_ENV=production

# Use non-root user
USER node
WORKDIR /home/node/app

# Copy only production dependencies
COPY --chown=node:node package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts from build stage
COPY --chown=node:node --from=build /home/node/app/dist ./dist

# Do not copy raw secrets, logs, or unnecessary files! (Ensured via .dockerignore)

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Start the application
CMD ["node", "dist/server.js"]
