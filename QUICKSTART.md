# 🚀 Quick Start Guide

## Get Up and Running in 5 Minutes

### Step 1: Prerequisites
- Install [Docker](https://docs.docker.com/get-docker/)
- Install [Docker Compose](https://docs.docker.com/compose/install/)

### Step 2: Setup
```bash
# Clone or navigate to the project
cd data_stream

# Run the automated setup
./setup.sh
```

### Step 3: Add Your Data
Place your CSV files in the `data/` directory:
```
data/
├── apex_2006_2023.csv
├── glt_2017_2022.csv
├── kittpeak_2019_2024.csv
└── sma_2006_2023.csv
```

### Step 4: Import Data
```bash
./import-data.sh
```

### Step 5: Access the Application
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000/graphql

## Quick Commands

```bash
make up          # Start services
make health      # Check status
make logs        # View logs
make down        # Stop services
make help        # See all commands
```

## CSV Data Format Required

Your CSV files should have these columns:
- `wdatetime` - Date/time string
- `temperature_k` - Temperature in Kelvin
- `dewpoint_k` - Dew point in Kelvin
- `pressure_kpa` - Pressure in kPa
- `relhumidity_pct` - Relative humidity %
- `winddir_deg` - Wind direction in degrees
- `windspeed_mps` - Wind speed in m/s
- `pwv_mm` - Precipitable water vapor in mm
- `phaserms_deg` - Phase RMS in degrees
- `tau183ghz`, `tau215ghz`, `tau225ghz` - Tau values

## Need Help?
- Check the full [README.md](README.md)
- Run `./health-check.sh` to diagnose issues
- Use `make help` for available commands
