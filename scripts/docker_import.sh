#!/bin/bash

# Run GPX import through Docker container in same network as PostgreSQL

docker run --rm \
  --network sporter_sporter-net \
  -v "$(pwd)":/app \
  -w /app \
  python:3.10-slim bash -c "
    pip install psycopg2-binary geoalchemy2 pydantic-settings sqlalchemy &&
    python3 -c '
import sys
sys.path.append(\"/app\")
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

# Use postgres hostname from Docker network
engine = create_engine(\"postgresql+psycopg2://dev:dev@postgres:5432/sporter\")

try:
    with engine.connect() as conn:
        result = conn.execute(text(\"SELECT version()\"))
        print(\"Database connection test successful:\", result.fetchone()[0][:50])
        
    # Now run the actual import
    from scripts.import_gpx import GPXImporter
    from app.models.activity import Activity
    from app.models.trackpoint import Trackpoint
    
    SessionLocal = sessionmaker(bind=engine)
    
    with SessionLocal() as db:
        importer = GPXImporter(db)
        activity = importer.import_file(\"$1\", 1)
        print(f\"✅ Successfully imported activity ID: {activity.id}\")
        
except Exception as e:
    print(f\"❌ Error: {e}\")
    exit(1)
'
"