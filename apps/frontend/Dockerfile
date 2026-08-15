# Production Stage — copies pre-built Vite dist from host
# Build the frontend on the host first: npm run build --workspace=@migrationguard/frontend
FROM nginx:alpine

COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY apps/frontend/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
