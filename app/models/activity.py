from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL, ForeignKey, func
from sqlalchemy.orm import relationship
from ..core.database import Base

class Activity(Base):
    __tablename__ = "activities"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Optional for now
    name = Column(String(255))
    activity_type = Column(String(50))  # 'running', 'cycling', 'walking', 'hiking'
    start_time = Column(TIMESTAMP(timezone=True))
    duration_seconds = Column(Integer)
    distance_km = Column(DECIMAL(8, 3))
    elevation_gain_m = Column(DECIMAL(8, 2))
    elevation_loss_m = Column(DECIMAL(8, 2))
    max_speed_ms = Column(DECIMAL(6, 3))
    avg_speed_ms = Column(DECIMAL(6, 3))
    
    # HR analytics (z wykluczeniem nieprawidłowych odczytów)
    avg_heart_rate = Column(Integer)
    max_heart_rate = Column(Integer)
    min_heart_rate = Column(Integer)
    
    # Metadane
    gpx_file_path = Column(String(500))
    total_trackpoints = Column(Integer)
    valid_hr_trackpoints = Column(Integer)
    
    created_at = Column(TIMESTAMP(timezone=True), default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="activities")
    trackpoints = relationship("Trackpoint", back_populates="activity", cascade="all, delete-orphan")
    analysis_segments = relationship("AnalysisSegment", back_populates="activity", cascade="all, delete-orphan")
    analytics_cache = relationship("AnalyticsCache", back_populates="activity", cascade="all, delete-orphan")