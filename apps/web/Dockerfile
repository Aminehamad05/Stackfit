FROM node:20-alpine AS build
WORKDIR /app
COPY apps/web/package.json apps/web/package-lock.json* ./ 
RUN npm install
COPY apps/web ./
ARG VITE_API_URL=http://localhost:4000/api
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
