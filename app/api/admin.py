# Sporter - Admin Endpoints

from fastapi import APIRouter, HTTPException, status, Depends
from sqlalchemy.orm import Session
from sqlalchemy import and_
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

from ..core.database import get_sync_session
from ..core.auth import get_approved_user
from ..models.user import User

router = APIRouter(prefix="/api/v1/admin", tags=["administration"])

class PendingUserResponse(BaseModel):
    id: int
    name: str
    email: str
    google_id: str
    created_at: datetime
    is_approved: bool

class ApprovalRequest(BaseModel):
    user_id: int
    approve: bool  # True to approve, False to reject

class ApprovalResponse(BaseModel):
    message: str
    user: dict

def get_admin_user(current_user: User = Depends(get_approved_user)) -> User:
    """Check if current user is admin - for now, first approved user is admin"""
    # TODO: Add proper role system later
    # For now, user ID 1 or first created user is admin
    if current_user.id != 1:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

@router.get("/pending-users", response_model=List[PendingUserResponse])
async def get_pending_users(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_sync_session)
):
    """Get all users pending approval"""
    pending_users = db.query(User).filter(
        and_(
            User.is_active == True,
            User.is_approved == False,
            User.google_id.isnot(None)  # Only OAuth users
        )
    ).order_by(User.created_at.desc()).all()
    
    return [
        PendingUserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            google_id=user.google_id,
            created_at=user.created_at,
            is_approved=user.is_approved
        )
        for user in pending_users
    ]

@router.post("/approve-user", response_model=ApprovalResponse)
async def approve_user(
    approval: ApprovalRequest,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_sync_session)
):
    """Approve or reject a user"""
    user = db.query(User).filter(
        User.id == approval.user_id,
        User.is_active == True
    ).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.is_approved and approval.approve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already approved"
        )
    
    if approval.approve:
        user.is_approved = True
        user.approved_by = admin_user.id
        user.approved_at = datetime.utcnow()
        message = f"User {user.name} has been approved"
    else:
        # Reject user by deactivating
        user.is_active = False
        message = f"User {user.name} has been rejected and deactivated"
    
    db.commit()
    db.refresh(user)
    
    return ApprovalResponse(
        message=message,
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_approved": user.is_approved,
            "is_active": user.is_active
        }
    )

@router.get("/users", response_model=List[dict])
async def get_all_users(
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_sync_session)
):
    """Get all users for admin management"""
    users = db.query(User).order_by(User.created_at.desc()).all()
    
    return [
        {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "is_approved": user.is_approved,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "approved_at": user.approved_at,
            "google_id": bool(user.google_id)  # Don't expose actual Google ID
        }
        for user in users
    ]

@router.post("/toggle-user-status")
async def toggle_user_status(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: Session = Depends(get_sync_session)
):
    """Toggle user active status"""
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot deactivate your own account"
        )
    
    user.is_active = not user.is_active
    db.commit()
    db.refresh(user)
    
    status_text = "activated" if user.is_active else "deactivated"
    return {
        "message": f"User {user.name} has been {status_text}",
        "user": {
            "id": user.id,
            "name": user.name,
            "is_active": user.is_active
        }
    }