# FlorenceRN ATS Connect — React SPA + Express API on node:sqlite (needs Node 24
# + --experimental-sqlite). Same shape as pathway. (ATS can later move to the
# shared Postgres with ATS_DB=postgres + DATABASE_URL and no code change.)
FROM node:24-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Bake the Core SSO URL into the SPA at build time (the SPA reads VITE_CORE_URL
# to know where to send users for sign-in).
ARG VITE_CORE_URL=https://id.florenceeducation.com
ENV VITE_CORE_URL=$VITE_CORE_URL
RUN npm run build

FROM node:24-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app ./
RUN if [ -d /app/data ]; then mv /app/data /app/data_seed; else mkdir -p /app/data_seed; fi \
    && mkdir -p /app/data && chmod +x docker-entrypoint.sh
EXPOSE 8788
ENTRYPOINT ["./docker-entrypoint.sh"]
