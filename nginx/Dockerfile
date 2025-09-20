## Multi-stage Dockerfile for building the React frontend and serving it with nginx

# Stage 1: Build the frontend with pnpm
FROM node:20 AS build
WORKDIR /app
# Enable pnpm via corepack
RUN corepack enable && corepack prepare pnpm@10.15.1 --activate
# Copy only package manifest and lock file to install dependencies
COPY apps/web/package.json apps/web/pnpm-lock.yaml* ./apps/web/
WORKDIR /app/apps/web
# Install dependencies without using a frozen lockfile (we may not commit one)
RUN pnpm install --no-frozen-lockfile
# Copy the rest of the frontend source code
COPY apps/web .
# Build the production bundle; Vite reads .env.production for API base URL
RUN pnpm build

# Stage 2: Runtime image using nginx
FROM nginx:alpine AS runtime
# Copy nginx configuration
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
# Copy the built frontend from the previous stage
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
# Expose port 80; this is configured in docker-compose
EXPOSE 80