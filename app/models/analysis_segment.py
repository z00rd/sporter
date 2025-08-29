from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL, Text, ForeignKey, func
from sqlalchemy.orm import relationship
from ..core.database import Base

class AnalysisSegment(Base):
    __tablename__ = "analysis_segments"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    segment_type = Column(String(50))  # 'warmup', 'main', 'cooldown', 'interval', 'rest'
    start_point_order = Column(Integer)
    end_point_order = Column(Integer)
    distance_km = Column(DECIMAL(8, 3))
    duration_seconds = Column(Integer)
    avg_heart_rate = Column(Integer)
    avg_pace_min_per_km = Column(DECIMAL(5, 2))
    notes = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    
    # Relationship
    activity = relationship("Activity", back_populates="analysis_segments")