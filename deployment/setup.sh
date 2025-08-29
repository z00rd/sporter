#!/bin/bash
# Complete development environment setup

set -e

echo "=== Sporter Development Setup ==="

# 1. Start containers
echo "Starting PostgreSQL and Redis containers..."
docker-compose up -d

# 2. Wait for PostgreSQL
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=dev psql -h localhost -U dev -d sporter -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

# 3. Initialize database with PostGIS
echo "Creating PostGIS extension..."
PGPASSWORD=dev psql -h localhost -U dev -d sporter -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# 4. Python venv setup
echo "Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# 5. Install dependencies
echo "Installing Python dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# 6. Initialize Alembic (if not already done)
if [ ! -f "alembic/versions/.gitkeep" ]; then
    echo "Initializing database migrations..."
    touch alembic/versions/.gitkeep
fi

# 7. Run migrations
echo "Running database migrations..."
alembic upgrade head

echo ""
echo "✅ Development environment ready!"
echo ""
echo "Next steps:"
echo "1. Activate venv: source venv/bin/activate"
echo "2. Start API: uvicorn app.main:app --reload"
echo "3. API docs: http://localhost:8000/docs"
echo ""
echo "Database migrations:"
echo "- Create migration: alembic revision --autogenerate -m 'description'"
echo "- Apply migration: alembic upgrade head"