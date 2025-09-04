# Claude Development Notes

## GPX Import - Database Connection Issues & Solutions

### Problem
GPX import script nie może połączyć się z PostgreSQL containerem z poziomu hosta:

```bash
python3 scripts/import_gpx.py --file "file.gpx" --user-id 1
# Error: FATAL: role "dev" does not exist
```

### Przyczyna
PostgreSQL w Docker containerze ma dwie różne perspektywy połączeń:

1. **Wewnątrz Docker network** (`postgres` hostname):
   - Działa ✅: `postgresql://dev:dev@postgres:5432/sporter`
   - Używane przez: migration container, inne services w docker-compose

2. **Z hosta przez port mapping** (`localhost:5432`):
   - Nie działa ❌: `postgresql://dev:dev@localhost:5432/sporter`
   - Problem: PostgreSQL authentication/user context różni się dla external connections

### Rozwiązania

#### 1. **Docker Network Approach (Zalecane)**
Uruchom Python script w containerze w tej samej sieci co PostgreSQL:

```bash
./scripts/docker_import.sh "path/to/file.gpx"
```

Script automatycznie:
- Tworzy tymczasowy container Python w sieci `sporter_sporter-net`
- Używa hostname `postgres` do połączenia
- Instaluje dependencies i uruchamia import

#### 2. **Host Connection Fix (Alternatywa)**
Jeśli chcesz uruchamiać z hosta, potrzebujesz:

```yaml
# W docker-compose.yml dodaj do postgres service:
environment:
  POSTGRES_HOST_AUTH_METHOD: trust  # Lub popraw pg_hba.conf
```

Ale zalecamy approach #1 dla consistency z production.

### Użycie

**Import GPX file:**
```bash
# Przez Docker network (zalecane)
./scripts/docker_import.sh "gpx/file.gpx"

# Lokalnie (jeśli zfixujesz connection)
python3 scripts/import_gpx.py --file "gpx/file.gpx" --user-id 1
```

**Sprawdzenie importu:**
```bash
docker-compose exec postgres psql -U dev -d sporter -c \
  "SELECT id, name, distance_km, duration_seconds FROM activities;"
```

### GPX Parser Features

**Automatic outlier detection:**
- **HR startup exclusion**: Pierwsze 3 minuty (często błędne odczyty)  
- **Statistical outliers**: Wykrycie ekstremalnych wartości (>3 MAD od median)
- **Flagi w DB**: `exclude_from_hr_analysis`, `exclusion_reason`

**Calculated metrics:**
- Distance, speed, duration
- HR statistics (excluding outliers)  
- Point-to-point distances and time gaps
- PostGIS geometry for spatial queries

**Example output:**
```
HR outlier detection: excluded 250/1885 trackpoints
  - Startup period: 174
  - Statistical outliers: 76
Created activity: Running-2025-08-28 (ID: 1)  
Activity summary: 6.073km in 1974s
Heart rate: 132 avg, 143 max
```

### Development Commands

```bash
# Start database
docker-compose up -d postgres

# Run migrations (ALWAYS from container!)
docker-compose --profile migration up migrate

# Create new migration (ALWAYS from container!)
docker-compose exec api alembic revision -m "Migration description"

# Import GPX
./scripts/docker_import.sh "path/to/file.gpx"

# Check data
docker-compose exec postgres psql -U dev -d sporter -c "SELECT * FROM activities;"
```