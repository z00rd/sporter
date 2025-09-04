from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from ..core.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=True)  # Optional for now
    name = Column(String(100), nullable=False, default="Anonymous User")
    
    # HR Profile settings
    hr_max = Column(Integer, nullable=True)  # Maximum heart rate
    hr_resting = Column(Integer, nullable=True)  # Resting heart rate
    birth_year = Column(Integer, nullable=True)  # Year of birth for calculating estimated HR max
    
    # Activity preferences
    default_activity_type = Column(String(50), default="running")
    
    # Settings
    use_metric_units = Column(Boolean, default=True)  # True = km/kg, False = miles/lbs
    
    # OAuth fields
    google_id = Column(String(255), unique=True, nullable=True, index=True)  # Google OAuth ID
    is_approved = Column(Boolean, default=False)  # Admin approval required
    approved_by = Column(Integer, nullable=True)  # ID of admin who approved
    approved_at = Column(DateTime, nullable=True)  # When was approved
    
    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    activities = relationship("Activity", back_populates="user")
    
    @property
    def age(self):
        """Calculate current age from birth_year"""
        if self.birth_year:
            current_year = datetime.now().year
            return current_year - self.birth_year
        return None
    
    @property
    def estimated_hr_max(self):
        """Calculate estimated HR max based on age if not provided"""
        if self.hr_max:
            return self.hr_max
        if self.age:
            return 220 - self.age  # Simple age-based formula
        return None
    
    @property 
    def hr_zones(self):
        """Calculate HR zones based on Karvonen method"""
        hr_max = self.estimated_hr_max
        hr_resting = self.hr_resting or 60  # Default resting HR
        
        if not hr_max:
            return None
            
        hr_reserve = hr_max - hr_resting
        
        return {
            "recovery": {
                "min": hr_resting,
                "max": round(hr_resting + (hr_reserve * 0.6)),
                "name": "Recovery Zone",
                "description": "0-60% HR Reserve"
            },
            "aerobic": {
                "min": round(hr_resting + (hr_reserve * 0.6)),
                "max": round(hr_resting + (hr_reserve * 0.7)),
                "name": "Aerobic Base",
                "description": "60-70% HR Reserve"
            },
            "tempo": {
                "min": round(hr_resting + (hr_reserve * 0.7)),
                "max": round(hr_resting + (hr_reserve * 0.8)),
                "name": "Tempo Zone",
                "description": "70-80% HR Reserve"
            },
            "threshold": {
                "min": round(hr_resting + (hr_reserve * 0.8)),
                "max": round(hr_resting + (hr_reserve * 0.9)),
                "name": "Lactate Threshold",
                "description": "80-90% HR Reserve"
            },
            "vo2max": {
                "min": round(hr_resting + (hr_reserve * 0.9)),
                "max": hr_max,
                "name": "VO2 Max",
                "description": "90-100% HR Reserve"
            }
        }
    
    def __repr__(self):
        return f"<User(id={self.id}, name='{self.name}', hr_max={self.hr_max})>"