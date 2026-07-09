# Florence OS app shell — built once, then served as static files behind Caddy.
FROM node:24-slim AS build
WORKDIR /workspace
COPY tsconfig.base.json ./
COPY packages/design-system ./packages/design-system
COPY apps/app-web/package*.json ./apps/app-web/
WORKDIR /workspace/apps/app-web
RUN npm ci
COPY apps/app-web ./
ARG VITE_CORE_URL=https://auth.florenceedu.com
ARG VITE_APPLY_URL=https://www.florenceedu.com/apply
ARG VITE_ACADEMY_API_URL=https://api.florenceedu.com
ARG VITE_PATHWAY_API_URL=/pathway-api
ARG VITE_EMPLOYER_CONNECT_API_URL=/employer-api
ARG VITE_LIVE_URL=https://app.florenceedu.com
ARG VITE_DEMO_NURSE_ID=demo-nurse-001
ENV VITE_CORE_URL=$VITE_CORE_URL \
    VITE_APPLY_URL=$VITE_APPLY_URL \
    VITE_ACADEMY_API_URL=$VITE_ACADEMY_API_URL \
    VITE_PATHWAY_API_URL=$VITE_PATHWAY_API_URL \
    VITE_EMPLOYER_CONNECT_API_URL=$VITE_EMPLOYER_CONNECT_API_URL \
    VITE_LIVE_URL=$VITE_LIVE_URL \
    VITE_DEMO_NURSE_ID=$VITE_DEMO_NURSE_ID
RUN npm run build

FROM caddy:2-alpine
COPY --from=build /workspace/apps/app-web/dist /srv
RUN printf ':{$PORT:80} {\n\troot * /srv\n\tencode gzip\n\ttry_files {path} /index.html\n\tfile_server\n}\n' > /etc/caddy/Caddyfile
EXPOSE 80
