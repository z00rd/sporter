#!/bin/bash
# Generate Alembic migration through Docker

set -e

echo "=== Generating Alembic Migration ==="

# Build temporary image for migration generation
docker build -f Dockerfile.migrate -t sporter-migrate .

# Run migration generation
docker run --rm \
  --network sporter_sporter-net \
  -e DATABASE_URL="postgresql+psycopg2://dev:dev@postgres:5432/sporter" \
  -v "$(pwd)":/app \
  -w /app \
  sporter-migrate \
  sh -c "alembic revision --autogenerate -m 'Initial schema'"

echo "✅ Migration generated!"
echo "To apply: docker-compose --profile migration up migrate"