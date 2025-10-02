#!/bin/bash

echo "Checking development environment status..."
echo ""

# Check MongoDB
echo "MongoDB Status:"
if brew services list | grep -q "mongodb-community@6.0.*started"; then
    echo "  MongoDB is running"
else
    echo "  MongoDB is NOT running"
fi
echo ""

# Check backend (port 4000)
echo "Backend Status:"
if lsof -ti:4000 > /dev/null 2>&1; then
    echo "  Backend is running on port 4000"
else
    echo "  Backend is NOT running on port 4000"
fi
echo ""

# Check frontend (port 3000)
echo "Frontend Status:"
if lsof -ti:3000 > /dev/null 2>&1; then
    echo "  Frontend is running on port 3000"
else
    echo "  Frontend is NOT running on port 3000"
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if brew services list | grep -q "mongodb-community@6.0.*started" && \
   lsof -ti:4000 > /dev/null 2>&1 && \
   lsof -ti:3000 > /dev/null 2>&1; then
    echo "All services are running!"
    echo ""
    echo "Frontend: http://localhost:3000"
    echo "Backend:  http://localhost:4000/graphql"
else
    echo "Some services are not running"
    echo ""
    echo "To start all services, run: npm run dev"
fi
