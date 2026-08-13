# Production Dockerfile for Khata Node.js Backend Server
FROM node:20-alpine

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy server application files
COPY server/ ./server/

EXPOSE 5000

ENV PORT=5000
ENV NODE_ENV=production

CMD ["node", "server/server.js"]
