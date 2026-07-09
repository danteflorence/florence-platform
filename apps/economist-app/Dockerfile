# Florence OS Workforce Economist API. No package install is needed: the service
# uses Node built-ins and the sibling TypeScript economist package directly.
FROM node:24-slim
WORKDIR /workspace
COPY packages/economist-api ./packages/economist-api
COPY apps/economist-app ./apps/economist-app
WORKDIR /workspace/apps/economist-app
ENV NODE_ENV=development PORT=8094 HOST=0.0.0.0
EXPOSE 8094
CMD ["node", "src/server.ts"]
