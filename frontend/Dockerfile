FROM node:18-alpine

WORKDIR /app

# Copy frontend package files
COPY frontend/package*.json ./frontend/

# Install frontend dependencies
RUN cd frontend && npm install

# Copy frontend source code
COPY frontend ./frontend/

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "start"]
