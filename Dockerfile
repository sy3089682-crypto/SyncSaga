FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json turbo.json tsconfig.base.json ./
COPY packages/config/package.json packages/config/
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN npm install
COPY . .
RUN npx turbo run build --filter=@syncsaga/api

FROM node:20-alpine AS runner
WORKDIR /app
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nodeuser
COPY --from=builder /app/apps/api/dist ./apps/api/dist
COPY --from=builder /app/packages/config/dist ./packages/config/dist
COPY --from=builder /app/packages/shared/dist ./packages/shared/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
USER nodeuser
EXPOSE 10000
ENV NODE_ENV=production PORT=10000
CMD ["node", "apps/api/dist/index.js"]
