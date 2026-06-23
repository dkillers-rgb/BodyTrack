# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (including dev deps for build)
RUN npm install --no-audit --no-fund

# Copy source code
COPY . .

# Generate Prisma client and build TypeScript
RUN npm run db:generate
RUN npm run build

# Runtime stage
FROM node:20-alpine

WORKDIR /app

# Install system dependencies for native modules (sharp, tesseract)
RUN apk add --no-cache \
  python3 \
  make \
  g++ \
  cairo-dev \
  jpeg-dev \
  pango-dev \
  giflib-dev

# Copy package files from builder
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev --no-audit --no-fund

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Copy generated Prisma client from builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Create uploads directory
RUN mkdir -p uploads

# Expose port
EXPOSE 3001

# Set environment
ENV NODE_ENV=production

# Start application
CMD ["npm", "start"]
