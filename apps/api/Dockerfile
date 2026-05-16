FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY apps/api ./apps/api
COPY packages ./packages

RUN npm run build --workspace=packages/shared
RUN npm run build --workspace=@syncsaga/api

FROM node:20-alpine AS runner

WORKDIR /app

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nodeuser

COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/apps/api/package.json ./
COPY --from=builder /app/node_modules ./node_modules

USER nodeuser

EXPOSE 4000

ENV NODE_ENV=production
ENV PORT=4000

CMD ["node", "apps/api/dist/index.js"]
