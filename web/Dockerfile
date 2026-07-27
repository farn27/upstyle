# ─── Stage 1: Build ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for argon2 (native module)
RUN apk add --no-cache python3 make g++ libc-dev

# Copy package files first for layer caching
COPY package*.json ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build SvelteKit app
RUN npm run build

# Remove devDependencies
RUN npm ci --omit=dev

# ─── Stage 2: Production ──────────────────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies only for argon2
RUN apk add --no-cache libc-dev

# Copy only what's needed
COPY --from=builder /app/build ./build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S sveltekit -u 1001

# Ensure uploads dir exists (for local dev fallback)
RUN mkdir -p /app/build/uploads && chown -R sveltekit:nodejs /app

USER sveltekit

EXPOSE 3000

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "build"]
