#!/bin/bash

# Data import script for Weather Data Visualization
# This script helps import CSV files into MongoDB

echo "==========================================="
echo "  Weather Data Import Script"
echo "==========================================="
echo ""

# Check if data directory exists
if [ ! -d "data" ]; then
    echo "❌ Error: 'data' directory not found!"
    echo "Please create a 'data' directory and place your CSV files there."
    exit 1
fi

# Check if Docker containers are running
if ! docker ps | grep -q "data_stream_mongodb"; then
    echo "❌ Error: MongoDB container is not running!"
    echo "Please start the containers first with: docker-compose up"
    exit 1
fi

echo "📁 Found CSV files in data directory:"
ls -la data/*.csv 2>/dev/null || { echo "❌ No CSV files found in data directory!"; exit 1; }
echo ""

# Function to import a CSV file
import_csv() {
    local file=$1
    local collection=$2
    
    if [ -f "data/$file" ]; then
        echo "📥 Importing $file into collection '$collection'..."
        docker exec data_stream_mongodb mongoimport \
            --db data_stream \
            --collection "$collection" \
            --type csv \
            --file "/data/import/$file" \
            --headerline \
            --drop
        
        if [ $? -eq 0 ]; then
            echo "✅ Successfully imported $file"
        else
            echo "❌ Failed to import $file"
        fi
        echo ""
    else
        echo "⚠️  Warning: $file not found, skipping..."
        echo ""
    fi
}

echo "🚀 Starting data import process..."
echo ""

# Import known CSV files
import_csv "apex_2006_2023.csv" "apex_2006_2023"
import_csv "glt_2017_2022.csv" "glt_2017_2022"
import_csv "kittpeak_2019_2024.csv" "kittpeak_2019_2024"
import_csv "sma_2006_2023.csv" "sma_2006_2023"

# Check for any other CSV files
echo "🔍 Checking for additional CSV files..."
for file in data/*.csv; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        collection_name="${filename%.*}"
        
        # Skip if already imported
        case $filename in
            "apex_2006_2023.csv"|"glt_2017_2022.csv"|"kittpeak_2019_2024.csv"|"sma_2006_2023.csv")
                continue
                ;;
            *)
                read -p "❓ Found additional file: $filename. Import as collection '$collection_name'? (y/n): " -n 1 -r
                echo
                if [[ $REPLY =~ ^[Yy]$ ]]; then
                    import_csv "$filename" "$collection_name"
                fi
                ;;
        esac
    fi
done

echo "✨ Data import process completed!"
echo ""
echo "📊 You can now access the application at:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:4000/graphql"
echo ""
echo "💡 Tip: If you add new collections, remember to update the backend code!"
