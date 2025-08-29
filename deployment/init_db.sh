#!/bin/bash
# Database initialization script

set -e

echo "=== Sporter Database Setup ==="

# Wait for postgres to be ready
echo "Waiting for PostgreSQL..."
until PGPASSWORD=dev psql -h localhost -U dev -d sporter -c '\q'; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"

# Create extensions
echo "Creating PostGIS extension..."
PGPASSWORD=dev psql -h localhost -U dev -d sporter -c "CREATE EXTENSION IF NOT EXISTS postgis;"

echo "Database setup complete!"
echo "Run 'alembic upgrade head' to apply migrations"