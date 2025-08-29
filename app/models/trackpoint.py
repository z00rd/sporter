from sqlalchemy import Column, Integer, String, TIMESTAMP, DECIMAL, Boolean, Text, ForeignKey, Index
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from ..core.database import Base

class Trackpoint(Base):
    __tablename__ = "trackpoints"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    point_order = Column(Integer, nullable=False)
    coordinates = Column(Geometry('POINT'), nullable=False)  # PostGIS POINT(longitude, latitude)
    elevation = Column(DECIMAL(7, 2))
    recorded_at = Column(TIMESTAMP(timezone=True), nullable=False)
    
    # Sensor data
    heart_rate = Column(Integer)
    cadence = Column(Integer)  # kroki/min dla biegania, obr/min dla kolarstwa
    temperature = Column(DECIMAL(4, 1))  # celsius
    speed_ms = Column(DECIMAL(6, 3))
    
    # Analysis flags - do wykluczania z analiz
    exclude_from_hr_analysis = Column(Boolean, default=False)
    exclude_from_gps_analysis = Column(Boolean, default=False)
    exclude_from_pace_analysis = Column(Boolean, default=False)
    exclusion_reason = Column(Text)  # 'hr_startup', 'gps_drift', 'pause', etc
    
    # Automatyczne znaczniki
    is_stationary = Column(Boolean, default=False)
    distance_from_previous_m = Column(DECIMAL(8, 3))
    time_gap_seconds = Column(Integer)
    
    created_at = Column(TIMESTAMP(timezone=True), default="now()")
    
    # Relationship
    activity = relationship("Activity", back_populates="trackpoints")
    
    # Indexes with unique names to avoid PostGIS conflicts
    __table_args__ = (
        Index('ix_sporter_trackpoints_activity_order', 'activity_id', 'point_order'),
        Index('ix_sporter_trackpoints_coords_gist', 'coordinates', postgresql_using='gist'),
        Index('ix_sporter_trackpoints_recorded_at', 'recorded_at'),
        Index('ix_sporter_trackpoints_hr_analysis', 'activity_id', 'exclude_from_hr_analysis'),
    )