#!/bin/bash
# Simple Alembic setup script that works with Docker

set -e

echo "=== Alembic Setup ==="

# Copy alembic files to container
echo "Copying alembic configuration to container..."
docker cp alembic.ini sporter-postgres-1:/tmp/
docker cp alembic/ sporter-postgres-1:/tmp/
docker cp app/ sporter-postgres-1:/tmp/
docker cp requirements.txt sporter-postgres-1:/tmp/

# Install alembic in container and run migration
echo "Running migration in container..."
docker-compose exec postgres sh -c '
    cd /tmp && 
    apt-get update && apt-get install -y python3 python3-pip && 
    pip3 install -r requirements.txt && 
    PYTHONPATH=/tmp DATABASE_URL="postgresql+psycopg2://dev:dev@localhost:5432/sporter" python3 -c "
import sys
sys.path.insert(0, \"/tmp\")
from app.core.database import Base
from app.models import Activity, Trackpoint, AnalysisSegment, AnalyticsCache

# Create all tables
from sqlalchemy import create_engine
engine = create_engine(\"postgresql+psycopg2://dev:dev@localhost:5432/sporter\")
Base.metadata.create_all(engine)
print(\"✅ Tables created successfully\")

# Create alembic version table
from sqlalchemy import text
with engine.connect() as conn:
    conn.execute(text(\"CREATE TABLE IF NOT EXISTS alembic_version (version_num VARCHAR(32) PRIMARY KEY)\"))
    conn.execute(text(\"INSERT INTO alembic_version (version_num) VALUES (\\'001\\') ON CONFLICT DO NOTHING\"))
    conn.commit()
print(\"✅ Alembic version table created\")
"
'

echo "✅ Database schema created successfully!"