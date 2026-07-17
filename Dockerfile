# Dockerfile for AgentShow Server
# Multi-stage build: compile TypeScript, then run with minimal image

# ===== Stage 1: Build =====
FROM node:20-slim AS builder

WORKDIR /app

# Copy workspace root files
COPY package.json package-lock.json ./
COPY tsconfig.json ./

# Copy all packages
COPY packages/ ./packages/

# Install dependencies
RUN npm ci

# Build all packages
RUN npm run build || true

# ===== Stage 2: Runtime =====
FROM node:20-slim AS runtime

WORKDIR /app

# Copy only what we need
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/packages/ ./packages/
COPY --from=builder /app/node_modules/ ./node_modules/

# Default port
ENV AGENTSHOW_PORT=9100
EXPOSE 9100

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+(process.env.AGENTSHOW_PORT||9100)+'/health').then(r=>{if(!r.ok)throw 1}).catch(()=>process.exit(1))"

CMD ["npx", "tsx", "scripts/dev-server.ts"]
