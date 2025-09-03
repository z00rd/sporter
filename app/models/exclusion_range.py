from sqlalchemy import Column, Integer, String, TIMESTAMP, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import relationship
from ..core.database import Base

class ExclusionRange(Base):
    __tablename__ = "exclusion_ranges"
    
    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id", ondelete="CASCADE"), nullable=False)
    start_time_seconds = Column(Integer, nullable=False)  # seconds from activity start
    end_time_seconds = Column(Integer, nullable=False)    # seconds from activity start
    reason = Column(String(100))                          # user-provided reason
    exclusion_type = Column(String(20), nullable=False, default='user_range')  # user_range, auto_point, user_point (future)
    created_at = Column(TIMESTAMP(timezone=True), default="now()")
    
    # Relationship
    activity = relationship("Activity", back_populates="exclusion_ranges")
    
    # Constraints and indexes (defined in migration)
    __table_args__ = (
        UniqueConstraint('activity_id', 'start_time_seconds', 'end_time_seconds', 'exclusion_type', 
                        name='uq_exclusion_ranges_activity_time_type'),
        Index('ix_exclusion_ranges_activity_id', 'activity_id'),
        Index('ix_exclusion_ranges_time', 'activity_id', 'start_time_seconds', 'end_time_seconds'),
    )
    
    def __repr__(self):
        return f"<ExclusionRange(activity_id={self.activity_id}, {self.start_time_seconds}-{self.end_time_seconds}s, {self.reason})>"
    
    @property
    def duration_seconds(self) -> int:
        """Get the duration of this exclusion range"""
        return self.end_time_seconds - self.start_time_seconds
    
    def contains_time(self, time_seconds: float) -> bool:
        """Check if a given time falls within this exclusion range"""
        return self.start_time_seconds <= time_seconds <= self.end_time_seconds