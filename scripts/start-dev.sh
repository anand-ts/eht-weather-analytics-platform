#!/bin/bash

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down development environment..."
    
    # Stop MongoDB service
    echo "Stopping MongoDB service..."
    brew services stop mongodb-community@6.0
    
    # Kill any remaining processes
    pkill -P $$ 2>/dev/null
    
    echo "Development environment stopped"
    exit 0
}

# Set up trap to catch SIGINT (Ctrl+C) and SIGTERM
trap cleanup SIGINT SIGTERM

# Start MongoDB service
echo "Starting MongoDB service..."
brew services start mongodb-community@6.0

# Wait a moment for MongoDB to start
sleep 2

# Check if MongoDB started successfully
if brew services list | grep -q "mongodb-community@6.0.*started"; then
    echo "MongoDB started successfully"
else
    echo "Failed to start MongoDB"
    exit 1
fi

# Start backend and frontend concurrently
echo "Starting backend and frontend..."
echo "Press Ctrl+C to stop all services (including MongoDB)"
echo ""

npx concurrently \
    --names "BACKEND,FRONTEND" \
    --prefix-colors "cyan,magenta" \
    --kill-others \
    "cd backend && npm run dev" \
    "cd frontend && npm start"

# This will run if concurrently exits normally
cleanup
