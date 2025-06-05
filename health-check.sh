#!/bin/bash

# Health check script for Weather Data Visualization

echo "🏥 Health Check - Weather Data Visualization"
echo "==========================================="
echo ""

# Check if containers are running
echo "📋 Checking Docker containers..."

# Function to check container status
check_container() {
    local container_name=$1
    local service_name=$2
    
    if docker ps --format "table {{.Names}}" | grep -q "$container_name"; then
        echo "   ✅ $service_name container is running"
        return 0
    else
        echo "   ❌ $service_name container is not running"
        return 1
    fi
}

# Check all containers
mongodb_running=false
backend_running=false
frontend_running=false

if check_container "data_stream_mongodb" "MongoDB"; then
    mongodb_running=true
fi

if check_container "data_stream_backend" "Backend"; then
    backend_running=true
fi

if check_container "data_stream_frontend" "Frontend"; then
    frontend_running=true
fi

echo ""

# Check service endpoints
echo "🌐 Checking service endpoints..."

# MongoDB Health Check
if [ "$mongodb_running" = true ]; then
    if docker exec data_stream_mongodb mongosh --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
        echo "   ✅ MongoDB is responsive"
        
        # Check if database exists and has data
        collections=$(docker exec data_stream_mongodb mongosh data_stream --eval "db.getCollectionNames()" --quiet 2>/dev/null | grep -o '\[.*\]' || echo "[]")
        if [ "$collections" != "[]" ]; then
            echo "   ✅ Database has collections: $collections"
        else
            echo "   ⚠️  Database exists but no collections found (run import-data.sh)"
        fi
    else
        echo "   ❌ MongoDB is not responsive"
    fi
else
    echo "   ❌ MongoDB container not running - skipping health check"
fi

# Backend Health Check
if [ "$backend_running" = true ]; then
    if curl -s http://localhost:4000/graphql >/dev/null 2>&1; then
        echo "   ✅ Backend GraphQL endpoint is responsive"
        
        # Test a simple GraphQL query
        response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d '{"query":"query{__schema{types{name}}}"}' \
            http://localhost:4000/graphql 2>/dev/null)
        
        if echo "$response" | grep -q '"data"'; then
            echo "   ✅ GraphQL schema is accessible"
        else
            echo "   ⚠️  GraphQL endpoint responding but schema may have issues"
        fi
    else
        echo "   ❌ Backend is not responsive on port 4000"
    fi
else
    echo "   ❌ Backend container not running - skipping health check"
fi

# Frontend Health Check
if [ "$frontend_running" = true ]; then
    if curl -s http://localhost:3000 >/dev/null 2>&1; then
        echo "   ✅ Frontend is responsive on port 3000"
    else
        echo "   ❌ Frontend is not responsive on port 3000"
    fi
else
    echo "   ❌ Frontend container not running - skipping health check"
fi

echo ""

# Overall status
if [ "$mongodb_running" = true ] && [ "$backend_running" = true ] && [ "$frontend_running" = true ]; then
    echo "🎉 Overall Status: HEALTHY"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:3000"
    echo "   Backend:  http://localhost:4000/graphql"
    echo "   MongoDB:  localhost:27017"
else
    echo "⚠️  Overall Status: UNHEALTHY"
    echo ""
    echo "🔧 Troubleshooting:"
    if [ "$mongodb_running" = false ] || [ "$backend_running" = false ] || [ "$frontend_running" = false ]; then
        echo "   - Run: docker-compose up -d"
    fi
    echo "   - Check logs: docker-compose logs"
    echo "   - Restart services: docker-compose restart"
fi

echo ""
