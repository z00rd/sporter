from fastapi import APIRouter, HTTPException, status
from typing import Optional
from pydantic import BaseModel, Field

from ..core.database import get_sync_session
from ..models.user import User

router = APIRouter(prefix="/api/v1/users", tags=["users"])

# Pydantic models
class UserCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    hr_max: Optional[int] = Field(None, ge=120, le=220, description="Maximum heart rate (120-220 bpm)")
    hr_resting: Optional[int] = Field(None, ge=30, le=100, description="Resting heart rate (30-100 bpm)")
    age: Optional[int] = Field(None, ge=10, le=120, description="Age (10-120 years)")
    default_activity_type: str = Field("running", description="Default activity type")
    use_metric_units: bool = Field(True, description="Use metric units (km) vs imperial (miles)")

class UserUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, max_length=255)
    hr_max: Optional[int] = Field(None, ge=120, le=220)
    hr_resting: Optional[int] = Field(None, ge=30, le=100)
    birth_year: Optional[int] = Field(None, ge=1900, le=2020)
    default_activity_type: Optional[str] = None
    use_metric_units: Optional[bool] = None

class UserResponse(BaseModel):
    id: int
    name: str
    email: Optional[str]
    hr_max: Optional[int]
    hr_resting: Optional[int]
    birth_year: Optional[int]
    age: Optional[int]  # Calculated property
    estimated_hr_max: Optional[int]
    default_activity_type: str
    use_metric_units: bool
    is_active: bool
    
    class Config:
        from_attributes = True

class HRZonesResponse(BaseModel):
    recovery: dict
    aerobic: dict
    tempo: dict
    threshold: dict
    vo2max: dict

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate):
    """Create a new user profile"""
    
    with get_sync_session() as db:
        # Check if email already exists
        if user_data.email:
            existing_user = db.query(User).filter(User.email == user_data.email).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )
        
        # Validate HR values
        if user_data.hr_max and user_data.hr_resting:
            if user_data.hr_resting >= user_data.hr_max:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Resting heart rate must be lower than maximum heart rate"
                )
        
        db_user = User(**user_data.dict())
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        
        return db_user

@router.get("/", response_model=list[UserResponse])
async def list_users():
    """List all users (for now, later add pagination)"""
    with get_sync_session() as db:
        users = db.query(User).filter(User.is_active == True).all()
        return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: int):
    """Get user by ID"""
    with get_sync_session() as db:
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate):
    """Update user profile"""
    with get_sync_session() as db:
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        update_data = user_data.dict(exclude_unset=True)
        
        # Validate HR values if both are being updated
        hr_max = update_data.get("hr_max", user.hr_max)
        hr_resting = update_data.get("hr_resting", user.hr_resting)
        
        if hr_max and hr_resting and hr_resting >= hr_max:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Resting heart rate must be lower than maximum heart rate"
            )
        
        # Check email uniqueness if updating email
        if "email" in update_data and update_data["email"]:
            existing_user = db.query(User).filter(
                User.email == update_data["email"],
                User.id != user_id
            ).first()
            if existing_user:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="User with this email already exists"
                )
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        db.commit()
        db.refresh(user)
        
        return user

@router.get("/{user_id}/hr-zones", response_model=HRZonesResponse)
async def get_user_hr_zones(user_id: int):
    """Get user's HR zones based on their profile"""
    with get_sync_session() as db:
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        hr_zones = user.hr_zones
        if not hr_zones:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot calculate HR zones. Please set your maximum heart rate or age."
            )
        
        return hr_zones

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    """Soft delete user"""
    with get_sync_session() as db:
        user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        user.is_active = False
        db.commit()

# Convenience endpoint to get/create default user
@router.get("/default/profile", response_model=UserResponse)
async def get_or_create_default_user():
    """Get or create a default user profile for single-user setup"""
    
    with get_sync_session() as db:
        # Look for existing default user
        user = db.query(User).filter(User.is_active == True).first()
        
        if not user:
            # Create default user
            user = User(
                name="Default User",
                default_activity_type="running",
                use_metric_units=True
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        
        return user