# Florence Academy — data API. Zero runtime deps (Node built-ins; `pg` optional
# for Postgres). Node 24 runs the TypeScript directly. Serves no static files —
# the SPA ships as a separate Render static site; this is the API only.
FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev || npm install --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 8088
CMD ["node", "src/index.ts"]
