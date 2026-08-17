# Stage 1: Build Frontend
FROM node:20-slim AS builder
WORKDIR /app
# Install OpenSSL required by Prisma for workspace integrity
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY . .
RUN npm ci
# We must generate prisma for the monorepo to build types correctly
RUN cd apps/server && npx prisma generate
RUN npm run build --workspace=@migrationguard/frontend

# Stage 2: Serve
FROM nginx:alpine
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
