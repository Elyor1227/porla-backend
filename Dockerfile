# ── Porla Backend — Production image ──
FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Faqat production node_modules va manba kod
COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY src ./src

# Yuklanadigan videolar uchun katalog (local storage rejimi)
RUN mkdir -p uploads/videos && \
    addgroup -S app && adduser -S app -G app && \
    chown -R app:app /app
USER app

EXPOSE 5000

# Konteyner sog'lig'i
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||5000)+'/api/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "src/index.js"]
