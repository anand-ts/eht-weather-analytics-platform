# Quick Start Guide 🛰️

### Step 1: Prerequisites

**Recommended Installation via Homebrew (macOS):**

First, install Homebrew via Terminal:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Then install Docker:
```bash
brew install --cask docker
```

**Alternative:** Install [Docker](https://docs.docker.com/get-docker/) directly from the official website


### Step 2: Setup
```bash
# Clone the repository
git clone https://github.gatech.edu/Xtreme-Astrophysics/data_stream.git

# Navigate to the project
cd data_stream

# Run the automated setup
./setup.sh
```

### Step 3: Add Your Data

Download the data from Dropbox:
**[Download Weather Data](https://www.dropbox.com/scl/fo/pqxir3n4cbmrgagihh1cb/AKM2OKaeNR6SuEMaZE5puM4?rlkey=lk7uml44wmqa6r0ts1anttcsf&st=ipybe69n&dl=0)**

Extract and place your CSV files in the `data/` directory:
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

**Note:** This process imports millions of weather data records and takes a few minutes to complete.

### Step 5: Access the Application
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000/graphql

## That's it! 📡

Your weather data visualization app is now running with your data loaded.

## Quick Commands

```bash
make up          # Start services
make health      # Check status
make logs        # View logs
make down        # Stop services
make help        # See all commands
```

Run `make health` to check if all services are running properly.

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

## Troubleshooting
- Check the full [README.md](README.md)
- Run `./health-check.sh` to diagnose issues
