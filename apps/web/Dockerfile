FROM node:20-alpine AS build
WORKDIR /app
# Single root lockfile owns all workspaces — install from the repo root.
# Copy BOTH workspace manifests first: npm errors when a workspace listed in
# the root package.json is missing, so the sibling stub must exist at install.
COPY package.json package-lock.json* ./
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/
RUN npm install --workspace apps/web --include-workspace-root
COPY apps/web ./apps/web/
# Same-origin default: the browser calls /api on the web origin and nginx
# proxies to the api service. Override at build time for a remote API, e.g.
# --build-arg VITE_API_URL=http://localhost:4000/api
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace apps/web

FROM nginx:alpine
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html
EXPOSE 80
