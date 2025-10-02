#!/bin/bash

# Weather Data Visualization - Quick Setup Script

set -e  # Exit on any error

echo "==========================================="
echo "  Weather Data Visualization Setup"
echo "==========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Please install Docker first."
    echo "   Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "Docker Compose is not available. Please install Docker Compose."
    echo "   Visit: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Docker is installed"
echo "Docker Compose is available"
echo ""

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "Creating data directory..."
    mkdir -p data
    echo "Data directory created"
    echo ""
    echo "IMPORTANT: Please place your CSV files in the 'data' directory before importing."
    echo "   Expected files:"
    echo "   - apex_2006_2023.csv"
    echo "   - glt_2017_2022.csv"
    echo "   - kittpeak_2019_2024.csv"
    echo "   - sma_2006_2023.csv"
    echo ""
    read -p "Press Enter once you've added your CSV files to the data directory..."
fi

# Check if CSV files exist
csv_count=$(ls data/*.csv 2>/dev/null | wc -l || echo 0)
if [ "$csv_count" -eq 0 ]; then
    echo "Warning: No CSV files found in data directory."
    echo "   You can add them later and run './import-data.sh' to import them."
    echo ""
fi

echo "Starting Docker containers..."
echo ""

# Build and start containers
docker-compose up --build -d

echo ""
echo "Waiting for services to be ready..."

# Wait for MongoDB to be ready
echo "   Checking MongoDB..."
timeout=60
count=0
while ! docker exec data_stream_mongodb mongosh --eval "db.adminCommand('ismaster')" >/dev/null 2>&1; do
    if [ $count -eq $timeout ]; then
        echo "MongoDB failed to start within $timeout seconds"
        exit 1
    fi
    sleep 1
    count=$((count + 1))
done
echo "   MongoDB is ready"

# Wait for backend to be ready
echo "   Checking Backend..."
timeout=60
count=0
while ! curl -s http://localhost:4000/graphql >/dev/null 2>&1; do
    if [ $count -eq $timeout ]; then
        echo "Backend failed to start within $timeout seconds"
        exit 1
    fi
    sleep 1
    count=$((count + 1))
done
echo "   Backend is ready"

# Wait for frontend to be ready
echo "   Checking Frontend..."
timeout=120
count=0
while ! curl -s http://localhost:3000 >/dev/null 2>&1; do
    if [ $count -eq $timeout ]; then
        echo "Frontend failed to start within $timeout seconds"
        exit 1
    fi
    sleep 1
    count=$((count + 1))
done
echo "   Frontend is ready"

echo ""
echo "Setup completed successfully!"
echo ""

# Import data if CSV files exist
if [ "$csv_count" -gt 0 ]; then
    echo "CSV files found. Would you like to import them now? (y/n)"
    read -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        ./import-data.sh
    else
        echo "You can import data later by running: ./import-data.sh"
    fi
fi

echo ""
echo "Application is now running:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4000/graphql"
echo "   MongoDB:  localhost:27017"
echo ""
echo "For more information, check the README.md file"
echo ""
echo "To stop the application, run: docker-compose down"
