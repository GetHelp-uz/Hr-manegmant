# Stage 1: Build
FROM node:20-slim AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config files
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all package.json files for workspace packages
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/hr-platform/package.json ./artifacts/hr-platform/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY artifacts/timepad/package.json ./artifacts/timepad/
COPY scripts/package.json ./scripts/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts || pnpm install --no-frozen-lockfile --ignore-scripts

# Copy all source code
COPY . .

# Build libraries first
RUN pnpm run typecheck:libs || true

# Build frontend (set PORT and BASE_PATH for vite config)
RUN cd artifacts/hr-platform && PORT=3000 BASE_PATH="/" NODE_ENV=production pnpm run build || true

# Build API server
RUN cd artifacts/api-server && pnpm run build || true

# Stage 2: Production
FROM node:20-slim AS runner

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.base.json tsconfig.json ./

# Copy all package.json files
COPY lib/db/package.json ./lib/db/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/hr-platform/package.json ./artifacts/hr-platform/
COPY artifacts/mockup-sandbox/package.json ./artifacts/mockup-sandbox/
COPY artifacts/timepad/package.json ./artifacts/timepad/
COPY scripts/package.json ./scripts/

# Install production dependencies only
RUN pnpm install --frozen-lockfile --ignore-scripts --prod || pnpm install --no-frozen-lockfile --ignore-scripts --prod

# Copy built files from builder
COPY --from=builder /app/artifacts/api-server/dist ./artifacts/api-server/dist/
COPY --from=builder /app/artifacts/hr-platform/dist ./artifacts/hr-platform/dist/
COPY --from=builder /app/lib ./lib/

# Expose port
EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080

CMD ["node", "artifacts/api-server/dist/index.cjs"]
