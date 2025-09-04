# Sporter - Authentication System

import os
from datetime import datetime, timedelta
from typing import Optional
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from authlib.integrations.starlette_client import OAuth
from sqlalchemy.orm import Session

from ..core.database import get_sync_session
from ..models.user import User

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 * 24 * 60  # 30 days

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET")

# OAuth setup
oauth = OAuth()
oauth.register(
    name='google',
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url='https://accounts.google.com/.well-known/openid-configuration',
    client_kwargs={
        'scope': 'openid email profile'
    }
)

security = HTTPBearer()

class TokenData(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None

class UserInToken(BaseModel):
    id: int
    email: str
    name: str
    is_approved: bool

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(token: str) -> TokenData:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        user_id_str: str = payload.get("sub")
        email: str = payload.get("email")
        
        if user_id_str is None:
            raise credentials_exception
        
        try:
            user_id = int(user_id_str)
        except (ValueError, TypeError):
            raise credentials_exception
            
        token_data = TokenData(user_id=user_id, email=email)
        return token_data
    except JWTError:
        raise credentials_exception

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_sync_session)
) -> User:
    """Get current authenticated user"""
    token_data = verify_token(credentials.credentials)
    
    user = db.query(User).filter(
        User.id == token_data.user_id,
        User.is_active == True
    ).first()
    
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

def get_approved_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current user but only if approved by admin"""
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending admin approval. Please wait for approval."
        )
    
    return current_user

async def create_or_update_user_from_google(google_user_info: dict, db: Session) -> User:
    """Create or update user from Google OAuth data"""
    google_id = google_user_info.get("sub")
    email = google_user_info.get("email")
    name = google_user_info.get("name", "Google User")
    
    if not google_id or not email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid Google user data"
        )
    
    # Check if user exists by google_id
    user = db.query(User).filter(User.google_id == google_id).first()
    
    if user:
        # Update existing user info
        user.email = email
        user.name = name
        user.updated_at = datetime.utcnow()
    else:
        # Create new user (requires approval)
        user = User(
            google_id=google_id,
            email=email,
            name=name,
            is_approved=False,  # Requires admin approval
            default_activity_type="running",
            use_metric_units=True
        )
        db.add(user)
    
    db.commit()
    db.refresh(user)
    return user

def create_user_token(user: User) -> str:
    """Create JWT token for user"""
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "name": user.name},
        expires_delta=access_token_expires
    )
    return access_token