FROM node:18-alpine

WORKDIR /app

# Copy backend package files
COPY backend/package*.json ./backend/

# Install backend dependencies
RUN cd backend && npm install

# Copy backend source code
COPY backend ./backend/

# Create directory for data
RUN mkdir -p /app/data

WORKDIR /app/backend

EXPOSE 4000

CMD ["node", "server.js"]
