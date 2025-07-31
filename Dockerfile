# 1. Build stage
FROM node:20 AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# 2. Production image with static file server
FROM node:20 AS production
WORKDIR /app

# Install static file server
RUN npm install -g serve

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port and serve
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]