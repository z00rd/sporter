from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, func, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import JSONB
from ..core.database import Base

class AnalyticsCache(Base):
    __tablename__ = "analytics_cache"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    metric_type = Column(String(100), nullable=False)  # 'hr_zones', 'pace_analysis', 'elevation_profile'
    parameters = Column(JSONB)  # parametry analizy (np. strefy HR, filtry)
    computed_data = Column(JSONB)  # wyniki analizy
    cache_version = Column(Integer, default=1)
    computed_at = Column(TIMESTAMP(timezone=True), default=func.now())
    expires_at = Column(TIMESTAMP(timezone=True))
    
    # Relationship
    activity = relationship("Activity", back_populates="analytics_cache")
    
    # Index for lookup with unique name
    __table_args__ = (
        Index('ix_sporter_analytics_cache_lookup', 'activity_id', 'metric_type', 'parameters'),
    )