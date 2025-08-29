from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add the app directory to the path so we can import models
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Import Base and models
from app.core.database import Base
from app.models import Activity, Trackpoint, AnalysisSegment, AnalyticsCache

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set the SQLAlchemy URL from environment variable if available
database_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://dev:dev@postgres:5432/sporter")
config.set_main_option("sqlalchemy.url", database_url)

# add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    
    def process_revision_directives(context, revision, directives):
        # Handle empty migrations
        if directives[0].upgrade_ops.is_empty():
            directives[:] = []
            print('No changes detected, skipping migration')
    
    def include_object(object, name, type_, reflected, compare_to):
        """Exclude PostGIS/Tiger tables from auto-generation"""
        if type_ == 'table':
            # Exclude PostGIS system tables
            if name in ['spatial_ref_sys'] or name.startswith(('tiger.', 'topology.')):
                return False
            # Exclude Tiger geocoder tables  
            tiger_tables = [
                'addr', 'addrfeat', 'bg', 'county', 'county_lookup', 'countysub_lookup',
                'cousub', 'direction_lookup', 'edges', 'faces', 'featnames', 'geocode_settings',
                'geocode_settings_default', 'layer', 'loader_lookuptables', 'loader_platform',
                'loader_variables', 'pagc_gaz', 'pagc_lex', 'pagc_rules', 'place', 'place_lookup',
                'secondary_unit_lookup', 'state', 'state_lookup', 'street_type_lookup', 'tabblock',
                'tabblock20', 'topology', 'tract', 'zcta5', 'zip_lookup', 'zip_lookup_all',
                'zip_lookup_base', 'zip_state', 'zip_state_loc'
            ]
            if name in tiger_tables:
                return False
        return True
    
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            process_revision_directives=process_revision_directives,
            include_object=include_object,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()