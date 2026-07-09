# Florence Education Pathway — React SPA + Express API. Production persistence
# must be Postgres; local SQLite is disabled in the production image.
FROM node:24-slim AS build
WORKDIR /workspace/apps/pathway-api
COPY apps/pathway-api/package*.json ./
RUN npm ci
COPY tsconfig.base.json /workspace/tsconfig.base.json
COPY packages /workspace/packages
COPY apps/pathway-api ./
# Bake the Core SSO URL into the SPA at build time (the SPA reads VITE_CORE_URL
# to know where to send users for sign-in).
ARG VITE_CORE_URL=https://auth.florenceedu.com
ENV VITE_CORE_URL=$VITE_CORE_URL
RUN npm run build

FROM node:24-slim AS run
WORKDIR /workspace/apps/pathway-api
ENV NODE_ENV=production
COPY --from=build /workspace /workspace
RUN chmod +x docker-entrypoint.sh
EXPOSE 8787
ENTRYPOINT ["./docker-entrypoint.sh"]
