# syntax=docker/dockerfile:1.7

FROM node:20.18.0-slim AS builder
WORKDIR /app
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY frontend/package.json frontend/package.json
RUN pnpm install --filter portal-assistants... --prod=false

COPY frontend frontend
COPY frontend/tsconfig*.json frontend/
COPY frontend/vite.config.ts frontend/
COPY frontend/tailwind.config.ts frontend/
COPY frontend/postcss.config.cjs frontend/
RUN pnpm --filter portal-assistants... run build

FROM node:20.18.0-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/frontend/dist ./dist
RUN npm install --global serve
EXPOSE 5173
CMD ["serve", "-s", "dist", "-l", "5173"]
