FROM node:20-alpine AS builder

WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json ./
COPY turbo.json tsconfig.base.json ./

COPY packages/config ./packages/config
COPY packages/db ./packages/db
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api

RUN npm ci --legacy-peer-deps

RUN npm run build --workspace=packages/config && \
    npm run build --workspace=packages/db && \
    npm run build --workspace=packages/shared && \
    npm run build --workspace=@syncsaga/api

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodeuser

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

USER nodeuser

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:4000/health || exit 1

CMD ["node", "apps/api/dist/index.js"]
