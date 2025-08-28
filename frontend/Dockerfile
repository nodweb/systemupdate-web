# Frontend Dockerfile (Vite React + Nginx)
FROM node:20-alpine AS build
WORKDIR /app
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_WS_URL=${VITE_WS_URL}
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund
COPY . /app
RUN npm run build

FROM nginx:alpine AS runtime
WORKDIR /usr/share/nginx/html
COPY --from=build /app/dist .
# Nginx config for SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
