# syntax=docker/dockerfile:1.7

FROM node:20.18.0-slim AS base
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

FROM base AS install
COPY package.json pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
RUN pnpm install --filter core-service... --prod=false

FROM install AS build
COPY backend backend
COPY tools tools
COPY backend/tsconfig*.json backend/
COPY backend/nest-cli.json backend/
COPY backend/prisma backend/prisma
RUN pnpm --filter core-service... run generate
RUN pnpm --filter core-service... run build

FROM node:20.18.0-slim AS production
WORKDIR /app
ENV NODE_ENV=production
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
COPY --from=install /app/node_modules /app/node_modules
COPY --from=build /app/backend/dist ./dist
COPY backend/package.json ./package.json
CMD ["node", "dist/main.js"]
