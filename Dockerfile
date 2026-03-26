FROM node:22-alpine AS builder

WORKDIR /usr/src/app

# If package-lock.json exists, npm ci is preferred.
COPY package*.json ./
RUN npm ci

COPY . .
# Set the API URL to be absolute path in case they use reverse proxy, or keep localhost if empty.
# They can override this by passing build arguments, but we'll default to the dev environment values.
ENV VITE_API_URL=http://localhost:3100
RUN npm run build

FROM nginx:alpine

# Copy built assets
COPY --from=builder /usr/src/app/dist /usr/share/nginx/html

# Copy custom nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
