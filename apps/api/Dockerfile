# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/package.json

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm install --frozen-lockfile

COPY apps/api/ ./apps/api/

# Generate Prisma client
RUN cd apps/api && pnpm exec prisma generate

# Compile TypeScript
RUN cd apps/api && pnpm exec tsc -p tsconfig.json

# Stage 2: Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Copy node_modules from builder (already installed, avoids re-running pnpm in runtime stage)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/node_modules ./apps/api/node_modules

# Copy package manifests (needed by Node module resolution)
COPY package.json pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json

# Copy compiled output, prisma files and source (seed.ts needs to be present for ts-node)
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/apps/api/generated ./apps/api/generated
COPY --from=builder /app/apps/api/prisma ./apps/api/prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
COPY --from=builder /app/apps/api/tsconfig.json ./apps/api/tsconfig.json

WORKDIR /app/apps/api
EXPOSE 3001
CMD ["node", "dist/src/main.js"]
