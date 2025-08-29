# Sporter

Platforma do analizy plików GPX z treningów sportowych.

## Szybki start

### Wymagania
- Python 3.9+
- Docker & Docker Compose
- Git

### Instalacja

1. **Klonowanie repo**
```bash
git clone <repo-url>
cd sporter
```

2. **Uruchomienie baz danych**
```bash
docker-compose up -d postgres
```

3. **Database migrations**
```bash
docker-compose --profile migration up migrate
```

4. **Instalacja Python dependencies (lokalnie)**
```bash
pip install geoalchemy2 psycopg2-binary pydantic-settings sqlalchemy
```

### Import GPX

**Import pliku GPX:**
```bash
./scripts/docker_import.sh "path/to/file.gpx"
```

**Sprawdzenie zaimportowanych aktywności:**
```bash
docker-compose exec postgres psql -U dev -d sporter -c \
  "SELECT id, name, distance_km, duration_seconds, avg_heart_rate FROM activities;"
```

**Przykładowy output:**
```
HR outlier detection: excluded 250/1885 trackpoints
  - Startup period: 174 (first 3 minutes)
  - Statistical outliers: 76 (>3 MAD from median)
Created activity: Running-2025-08-28 (ID: 1)
Activity summary: 6.073km in 1974s
Heart rate: 132 avg, 143 max
✅ Successfully imported activity ID: 1
```

### Development

**Zatrzymanie baz danych:**
```bash
docker-compose down
```

**Czyszczenie danych (⚠️ usuwa wszystkie aktywności):**
```bash
docker-compose down -v
```

**Sprawdzenie logów:**
```bash
docker-compose logs postgres
docker-compose logs redis
```

**Troubleshooting:**
- Connection issues z localhost → Zobacz `CLAUDE.md` 
- Migration problems → `docker-compose --profile migration up --build migrate`
- Fresh database → `docker-compose down -v && docker-compose up -d postgres`

**Development files:**
- `CLAUDE.md` - Database connection issues, Docker network setup
- `TODO.md` - Roadmap i development plan

---

## Architektura

### Stack technologiczny
- **Backend**: Python + FastAPI + SQLAlchemy + GeoAlchemy2
- **Database**: PostgreSQL + PostGIS (geo data)
- **Cache**: Redis  
- **Development**: Docker Compose
- **Production**: Google Cloud Platform

### Struktura projektu
```
sporter/
├── app/
│   ├── main.py           # FastAPI aplikacja
│   ├── api/              # API endpoints
│   │   ├── routes/       # route handlers
│   │   └── dependencies/ # dependency injection
│   ├── core/             # konfiguracja, database połączenia
│   ├── models/           # SQLAlchemy + GeoAlchemy2 modele
│   ├── services/         # business logic, GPX parsing
│   └── utils/            # helper functions
├── alembic/              # database migrations
├── tests/                # testy
└── docker-compose.yml    # lokalne środowisko
```

### Baza danych (PostGIS)

**Schemat bazy (aktualne tabele):**

**`activities`** - główne metryki aktywności:
- `name`, `activity_type`, `start_time`, `duration_seconds`
- `distance_km`, `avg_speed_ms`, `max_speed_ms`
- `avg_heart_rate`, `max_heart_rate`, `min_heart_rate` (excluding outliers)
- `total_trackpoints`, `valid_hr_trackpoints`
- `gpx_file_path`

**`trackpoints`** - szczegółowe punkty GPS:
- `coordinates` (PostGIS POINT geometry)
- `elevation`, `recorded_at`, `heart_rate`, `speed_ms`
- `distance_from_previous_m`, `time_gap_seconds`
- **Flagi do wykluczania outlierów:**
  - `exclude_from_hr_analysis`, `exclude_from_gps_analysis`, `exclude_from_pace_analysis`
  - `exclusion_reason` ('hr_startup', 'hr_statistical_outlier', etc.)

**`analysis_segments`** - segmenty analiz (future):
- Custom segments wyznaczone przez użytkownika
- Metryki dla konkretnych części trasy

**`analytics_cache`** - cache przeliczeń:
- JSONB storage dla wyników analiz
- Versioning i expiration

**PostGIS features:**
- GIST indexes dla spatial queries
- Distance calculations between points
- Route analysis, elevation profiles

### Przyszłe rozszerzenia
- Frontend (React/Next.js)
- Autentyfikacja użytkowników
- Upload plików GPX
- Różne typy analiz (pace, elevation, heart rate zones)
- Export raportów
- Cloud deployment na GCP