FROM node:20-alpine AS build
WORKDIR /app
# Single root lockfile owns all workspaces — install from the repo root.
COPY package.json package-lock.json ./
COPY apps/web/package.json ./apps/web/
RUN npm install --workspace apps/web --include-workspace-root
COPY apps/web ./apps/web/
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace apps/web

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
