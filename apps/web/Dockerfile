# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Enable corepack with a pinned pnpm version to get a stable, cacheable layer
RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

# Copy workspace root files needed for pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/ ./packages/

# Copy web app
COPY apps/web/package.json ./apps/web/package.json

# Mount pnpm store as a build cache so unchanged packages are never re-downloaded
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# Copy web source
COPY apps/web/ ./apps/web/

# Build
RUN cd apps/web && pnpm run build

# Stage 2: Serve
FROM nginx:alpine AS runner
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
