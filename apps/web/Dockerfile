# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Copy workspace root files needed for pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml turbo.json ./
COPY packages/ ./packages/

# Copy web app
COPY apps/web/package.json ./apps/web/package.json

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install deps
RUN pnpm install --frozen-lockfile

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
