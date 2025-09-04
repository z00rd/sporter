# 🔄 Alembic Guide - Database Schema Changes (DEV Environment)

> **⚠️ DEVELOPMENT SETUP:** This guide covers dev environment workflow using Docker.  
> **🚀 Production workflow** will be implemented later with proper CI/CD pipeline.

## 📋 Quick Reference (TL;DR)

```bash
# 1. Edit model in app/models/*.py
# 2. Create migration through Docker
docker-compose run --rm api alembic revision --autogenerate -m "describe your change"
# 3. Review generated migration in alembic/versions/
# 4. Apply migration to database
docker-compose run --rm api alembic upgrade head
# 5. Verify in database
docker-compose exec postgres psql -U dev -d sporter -c "\d table_name"
```

## 🚨 Critical: Always Use Docker Commands

**❌ DON'T run locally** - missing dependencies (geoalchemy2, etc.):
```bash
# ❌ This will FAIL with dependency errors
alembic revision --autogenerate -m "change"
ALEMBIC_URL="..." alembic upgrade head
```

**✅ DO run through Docker containers**:
```bash
# ✅ This works - all dependencies available
docker-compose run --rm api alembic [command]
docker-compose exec postgres psql -U dev -d sporter
```

## 🔄 Complete Workflow Example

### Scenario: Change `age` field to `birth_year` in Users table

#### 1. **Edit the Model**
```python
# File: app/models/user.py
class User(Base):
    __tablename__ = "users"
    
    # CHANGE THIS:
    # age = Column(Integer, nullable=True)
    
    # TO THIS:
    birth_year = Column(Integer, nullable=True)  # Year of birth
    
    @property
    def age(self):
        """Calculate current age from birth_year"""
        if self.birth_year:
            return datetime.now().year - self.birth_year
        return None
```

#### 2. **Create Migration (Through Docker)**
```bash
docker-compose run --rm api alembic revision --autogenerate -m "Change age to birth_year in users table"
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Context impl PostgresqlImpl.
INFO  [alembic.autogenerate.compare] Detected added column 'users.birth_year'
INFO  [alembic.autogenerate.compare] Detected removed column 'users.age'
Generating /app/alembic/versions/c12345678901_change_age_to_birth_year.py ... done
```

#### 3. **Review Generated Migration**
```bash
# Check the generated file
cat alembic/versions/*change_age_to_birth_year*.py
```

**Example generated content:**
```python
def upgrade() -> None:
    op.add_column('users', sa.Column('birth_year', sa.Integer(), nullable=True))
    op.drop_column('users', 'age')

def downgrade() -> None:
    op.add_column('users', sa.Column('age', sa.Integer(), nullable=True))
    op.drop_column('users', 'birth_year')
```

**⚠️ Review Checklist:**
- [ ] Are new columns nullable=True for existing data?
- [ ] Is there data migration logic if needed?
- [ ] Does downgrade() make sense?
- [ ] Are there any dangerous DROP operations?

#### 4. **Enhance Migration with Data Migration (if needed)**
```python
def upgrade() -> None:
    # Add new column
    op.add_column('users', sa.Column('birth_year', sa.Integer(), nullable=True))
    
    # Migrate existing data: convert age to approximate birth year
    op.execute("UPDATE users SET birth_year = 2025 - age WHERE age IS NOT NULL")
    
    # Drop old column
    op.drop_column('users', 'age')

def downgrade() -> None:
    # Add old column back
    op.add_column('users', sa.Column('age', sa.Integer(), nullable=True))
    
    # Migrate data back
    op.execute("UPDATE users SET age = 2025 - birth_year WHERE birth_year IS NOT NULL")
    
    # Drop new column
    op.drop_column('users', 'birth_year')
```

#### 5. **Apply Migration**
```bash
docker-compose run --rm api alembic upgrade head
```

**Expected Output:**
```
INFO  [alembic.runtime.migration] Running upgrade b25508eccc85 -> c12345678901, Change age to birth_year in users table
```

#### 6. **Verify Changes**
```bash
# Check table structure
docker-compose exec postgres psql -U dev -d sporter -c "\d users"

# Check migrated data
docker-compose exec postgres psql -U dev -d sporter -c "SELECT id, name, birth_year FROM users;"

# Check current migration version
docker-compose exec postgres psql -U dev -d sporter -c "SELECT version_num FROM alembic_version;"
```

## 🛠️ Alembic Commands Reference

### Core Operations (All through Docker)

```bash
# Create auto-generated migration
docker-compose run --rm api alembic revision --autogenerate -m "description"

# Create empty migration (for manual SQL)
docker-compose run --rm api alembic revision -m "manual change description"

# Apply all pending migrations
docker-compose run --rm api alembic upgrade head

# Apply specific migration
docker-compose run --rm api alembic upgrade abc123def456

# Rollback one step
docker-compose run --rm api alembic downgrade -1

# Rollback to specific version
docker-compose run --rm api alembic downgrade abc123def456

# Show migration history
docker-compose run --rm api alembic history

# Show current version
docker-compose run --rm api alembic current

# Show specific migration details
docker-compose run --rm api alembic show abc123def456
```

### Database Inspection Commands

```bash
# Connect to database
docker-compose exec postgres psql -U dev -d sporter

# Inside psql:
\l          # List databases
\d          # List tables
\d users    # Describe users table
\q          # Quit

# One-liner queries
docker-compose exec postgres psql -U dev -d sporter -c "SELECT version_num FROM alembic_version;"
docker-compose exec postgres psql -U dev -d sporter -c "\d users"
```

## 🚨 Troubleshooting Common Issues

### 1. **"ModuleNotFoundError: No module named 'geoalchemy2'"**
```
❌ Problem: Running alembic locally without Docker
✅ Solution: Always use docker-compose run --rm api alembic [command]
```

### 2. **"No changes detected in schema"**
```bash
❌ Problem: Model changes not detected by autogenerate
✅ Solution: Check if model is imported in alembic/env.py:

# File: alembic/env.py
from app.models import Activity, Trackpoint, User, AnalysisSegment, AnalyticsCache
```

### 3. **"Connection refused" or database errors**
```bash
❌ Problem: Database not running or connection issues
✅ Solution: Start postgres first and wait for ready state:

docker-compose up -d postgres
# Wait 10-15 seconds for postgres to be ready
docker-compose run --rm api alembic upgrade head
```

### 4. **"Invalid revision identifier"**
```bash
❌ Problem: Migration files corrupted or missing
✅ Solution: Check alembic/versions/ and fix revision chain:

# List all migrations
ls -la alembic/versions/
# Check each file's revision/down_revision chain
```

### 5. **PostGIS tables appearing in migrations**
```
❌ Problem: Alembic tries to modify system PostGIS tables
✅ Solution: Already handled in alembic/env.py with include_object() filter
```

## 📝 Best Practices for Development

### Model Design
- **Make new columns nullable=True** for existing data compatibility
- **Add sensible defaults** for NOT NULL columns
- **Use appropriate data types**: `String(50)` not `Text()` for short fields
- **Follow naming convention**: snake_case for column names

### Migration Review
- **Always review generated migrations** before applying
- **Test complex migrations on copy of production data**
- **Add data migration logic** when changing data types
- **Write rollback-safe downgrade()** functions

### Development Workflow
```bash
# 1. Make sure database is running
docker-compose up -d postgres

# 2. Edit model files
vim app/models/user.py

# 3. Create migration
docker-compose run --rm api alembic revision --autogenerate -m "Add birth_year field"

# 4. Review and edit migration if needed
vim alembic/versions/*birth_year*.py

# 5. Apply migration
docker-compose run --rm api alembic upgrade head

# 6. Verify changes
docker-compose exec postgres psql -U dev -d sporter -c "\d users"

# 7. Test in application
# (restart API if needed)
curl http://localhost:8000/api/v1/users/1

# 8. Commit changes
git add app/models/ alembic/versions/
git commit -m "feat: add birth_year field to User model"
```

## 🚀 Production Deployment Notes

> **Coming Soon:** Production migration workflow will include:
> - Automated migration testing in CI/CD pipeline
> - Blue-green deployment for zero-downtime schema changes
> - Migration rollback procedures
> - Database backup automation before migrations
> - Multi-environment promotion process (dev → staging → prod)

For now, **all changes are applied to development database only**.

## 💡 Pro Tips

1. **Backup before complex migrations**:
   ```bash
   docker-compose exec postgres pg_dump -U dev sporter > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test rollback in development**:
   ```bash
   # Apply migration
   docker-compose run --rm api alembic upgrade head
   # Test rollback
   docker-compose run --rm api alembic downgrade -1
   # Re-apply
   docker-compose run --rm api alembic upgrade head
   ```

3. **Use descriptive migration messages**:
   ```bash
   ✅ Good: "Add birth_year field and migrate existing age data"
   ❌ Bad: "update users"
   ```

4. **Check for breaking API changes**:
   After schema changes, update API models in `app/api/` to match database schema.

---

**Remember**: In development, we have the luxury of experimenting. In production, every migration counts! 🎯