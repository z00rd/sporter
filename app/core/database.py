from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session

# Base for all models
Base = declarative_base()

# Function to create async engine (called only when needed)
def get_async_engine():
    from .config import settings
    return create_async_engine(settings.database_url, echo=True)

# Function to create session maker (called only when needed)  
def get_async_session_local():
    async_engine = get_async_engine()
    return sessionmaker(async_engine, class_=AsyncSession, expire_on_commit=False)

# Sync engine and session for CLI scripts
def get_sync_engine():
    # Use environment variable or default to Docker network
    import os
    sync_url = os.getenv("DATABASE_URL", "postgresql+psycopg2://dev:dev@postgres:5432/sporter")
    return create_engine(sync_url, echo=True)

def get_sync_session_local():
    sync_engine = get_sync_engine()
    return sessionmaker(bind=sync_engine)

def get_sync_session():
    """Context manager for sync database sessions"""
    SessionLocal = get_sync_session_local()
    session = SessionLocal()
    try:
        return session
    finally:
        session.close()

async def get_db():
    AsyncSessionLocal = get_async_session_local()
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()