# Weather Data Visualization - Docker Setup

This project provides a containerized weather data visualization application for telescope observatories, featuring a React frontend, Node.js GraphQL backend, and MongoDB database.

## 🏗️ Architecture

- **Frontend**: React.js with Apollo Client, Chart.js, and Tailwind CSS (Port 3000)
- **Backend**: Node.js Express with Apollo Server GraphQL (Port 4000)
- **Database**: MongoDB (Port 27017)

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system
- CSV data files for telescope weather data

### 1. Clone and Setup

```bash
git clone <your-repo-url>
cd data_stream
```

### 2. Prepare Your CSV Data

Create a `data` directory in the project root (if it doesn't exist) and place your CSV files there:

```
data_stream/
├── data/
│   ├── apex_2006_2023.csv
│   ├── glt_2017_2022.csv
│   ├── kittpeak_2019_2024.csv
│   └── sma_2006_2023.csv
├── docker-compose.yml
├── frontend/
├── backend/
└── README.md
```

**Important**: Your CSV files should have these columns:
- `wdatetime` (datetime string)
- `temperature_k` (temperature in Kelvin)
- `dewpoint_k` (dew point in Kelvin)
- `pressure_kpa` (pressure in kPa)
- `relhumidity_pct` (relative humidity percentage)
- `winddir_deg` (wind direction in degrees)
- `windspeed_mps` (wind speed in m/s)
- `pwv_mm` (precipitable water vapor in mm)
- `phaserms_deg` (phase RMS in degrees)
- `tau183ghz`, `tau215ghz`, `tau225ghz` (tau values)

### 3. Start the Application

```bash
docker-compose up --build
```

This will:
- Build and start MongoDB container
- Build and start the backend container
- Build and start the frontend container

### 4. Import CSV Data to MongoDB

Once the containers are running, you need to import your CSV data into MongoDB:

```bash
# Access the MongoDB container
docker exec -it data_stream_mongodb bash

# Import each CSV file (replace filenames as needed)
mongoimport --db data_stream --collection apex_2006_2023 --type csv --file /data/import/apex_2006_2023.csv --headerline

mongoimport --db data_stream --collection glt_2017_2022 --type csv --file /data/import/glt_2017_2022.csv --headerline

mongoimport --db data_stream --collection kittpeak_2019_2024 --type csv --file /data/import/kittpeak_2019_2024.csv --headerline

mongoimport --db data_stream --collection sma_2006_2023 --type csv --file /data/import/sma_2006_2023.csv --headerline

# Exit the container
exit
```

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend GraphQL Playground**: http://localhost:4000/graphql
- **MongoDB**: localhost:27017

## 🗂️ Project Structure

```
data_stream/
├── frontend/                 # React frontend application
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── assets/          # Images and static files
│   │   └── queries.js       # GraphQL queries
│   ├── public/              # Public assets
│   ├── Dockerfile          # Frontend container definition
│   └── package.json        # Frontend dependencies
├── backend/                 # Node.js backend application
│   ├── server.js           # Main server file with GraphQL setup
│   ├── Dockerfile          # Backend container definition
│   └── package.json        # Backend dependencies
├── data/                   # CSV data files for import
├── docker-compose.yml      # Docker services orchestration
└── README.md              # This file
```

## 🔧 Development

### Running Individual Services

If you want to run services individually for development:

```bash
# Start only MongoDB
docker-compose up mongodb

# Start backend (requires MongoDB)
cd backend && npm install && npm start

# Start frontend (requires backend)
cd frontend && npm install && npm start
```

### Adding New Data Collections

1. Place your CSV file in the `data/` directory
2. Import it using mongoimport (see step 4 above)
3. Update the `weatherModelMap` in `backend/server.js` to include your new collection
4. Update the GraphQL enum `CollectionName` in the backend

### Customizing Data Import

The CSV import process expects specific column names. If your CSV has different column names, you can either:
1. Rename the columns in your CSV to match the expected format
2. Modify the Mongoose schema in `backend/server.js`

## 🛠️ Troubleshooting

### Common Issues

1. **Port conflicts**: If ports 3000, 4000, or 27017 are in use, modify the ports in `docker-compose.yml`

2. **Data not showing**: Ensure you've imported the CSV data using mongoimport

3. **Frontend can't connect to backend**: Check that all containers are running with `docker-compose ps`

4. **MongoDB connection issues**: Restart the containers with `docker-compose restart`

### Viewing Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs mongodb
```

### Stopping the Application

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: This will delete your database data)
docker-compose down -v
```

## 📊 Using the Application

1. **Home Screen**: Choose between Variable View or Telescope View
2. **Variable View**: Select multiple weather variables to compare across time
3. **Telescope View**: Compare the same variable across different telescopes
4. **Features**: 
   - Interactive charts with zoom and pan
   - Date range filtering
   - Moving averages
   - Data export (PNG/CSV)
   - Dark/light mode toggle

## 🔄 Data Management

### Backup Data
Your MongoDB data is stored in a Docker volume. To backup:

```bash
docker exec data_stream_mongodb mongodump --db data_stream --out /data/backup
docker cp data_stream_mongodb:/data/backup ./mongodb_backup
```

### Restore Data
```bash
docker cp ./mongodb_backup data_stream_mongodb:/data/restore
docker exec data_stream_mongodb mongorestore --db data_stream /data/restore/data_stream
```

