FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
COPY . .
RUN pnpm install --no-frozen-lockfile
RUN pnpm build
CMD ["sh", "-c", "pnpm preview --host 0.0.0.0 --port 5173"]
