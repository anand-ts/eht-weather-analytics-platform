#!/bin/bash

# Stop MongoDB service
echo "Stopping MongoDB service..."
brew services stop mongodb-community@6.0

# Check if MongoDB stopped successfully
if brew services list | grep -q "mongodb-community@6.0.*stopped"; then
    echo "MongoDB stopped successfully"
else
    echo "MongoDB may still be running"
fi

echo "Development environment stopped"
