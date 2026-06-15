# FlorenceRN Core — identity / SSO service. Node 24 runs TypeScript directly
# (no build step); `pg` (optionalDependency) is installed for the Postgres store.
FROM node:24-slim
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
# Render injects $PORT; default 8080 for local `docker run`.
EXPOSE 8080
CMD ["node", "src/index.ts"]
