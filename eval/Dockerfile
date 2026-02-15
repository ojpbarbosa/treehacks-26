FROM oven/bun:1 AS base

WORKDIR /app

# Install deps
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile 2>/dev/null || bun install

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

ENV NODE_ENV=production

EXPOSE 3000

CMD ["bun", "run", "src/eval/server.ts"]
