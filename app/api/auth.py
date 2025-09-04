# Sporter - Authentication Endpoints

from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional

from ..core.database import get_sync_session
from ..core.auth import (
    oauth, 
    create_or_update_user_from_google, 
    create_user_token,
    get_current_user,
    get_approved_user
)
from ..models.user import User

router = APIRouter(prefix="/api/v1/auth", tags=["authentication"])

class LoginResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict
    message: str

class UserProfile(BaseModel):
    id: int
    name: str
    email: str
    is_approved: bool
    is_active: bool
    google_id: Optional[str]

@router.get("/google")
async def google_login(request: Request):
    """Redirect to Google OAuth"""
    redirect_uri = request.url_for('google_callback')
    return await oauth.google.authorize_redirect(request, redirect_uri)

@router.get("/google/callback")
async def google_callback(request: Request, db: Session = Depends(get_sync_session)):
    """Handle Google OAuth callback"""
    try:
        token = await oauth.google.authorize_access_token(request)
        user_info = token.get('userinfo')
        
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to get user info from Google"
            )
        
        # Create or update user
        user = await create_or_update_user_from_google(user_info, db)
        
        # Create JWT token
        access_token = create_user_token(user)
        
        # Redirect to frontend with token
        if user.is_approved:
            frontend_url = f"/?token={access_token}&status=success"
        else:
            frontend_url = f"/?token={access_token}&status=pending_approval"
        
        return RedirectResponse(url=frontend_url)
        
    except Exception as e:
        # Redirect to frontend with error
        return RedirectResponse(url=f"/?error=auth_failed&message={str(e)}")

@router.get("/me", response_model=UserProfile)
async def get_current_user_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return UserProfile(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        is_approved=current_user.is_approved,
        is_active=current_user.is_active,
        google_id=current_user.google_id
    )

@router.post("/logout")
async def logout():
    """Logout user (client should delete token)"""
    return {"message": "Logged out successfully"}

@router.get("/status")
async def auth_status(current_user: User = Depends(get_current_user)):
    """Check authentication status"""
    return {
        "authenticated": True,
        "approved": current_user.is_approved,
        "user": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email
        }
    }

# Protected endpoint example
@router.get("/protected")
async def protected_route(current_user: User = Depends(get_approved_user)):
    """Example of protected route that requires approval"""
    return {
        "message": f"Hello {current_user.name}, you have access!",
        "user_id": current_user.id
    }