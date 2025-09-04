# Sporter - Security Module

import os
import re
import uuid
import magic
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Tuple
from fastapi import HTTPException, status, UploadFile

# Security configuration
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_EXTENSIONS = {'.gpx'}
ALLOWED_MIME_TYPES = {'application/xml', 'text/xml', 'application/gpx+xml'}
UPLOAD_DIR = Path("uploads")

# Ensure upload directory exists and is secure
UPLOAD_DIR.mkdir(exist_ok=True)
os.chmod(UPLOAD_DIR, 0o755)  # Read/write for owner, read for others

def sanitize_filename(filename: str) -> str:
    """Sanitize filename to prevent directory traversal and other attacks"""
    if not filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )
    
    # Remove or replace dangerous characters
    filename = re.sub(r'[<>:"/\\|?*]', '_', filename)
    filename = re.sub(r'\.{2,}', '.', filename)  # Remove multiple dots
    filename = filename.strip('.')  # Remove leading/trailing dots
    
    # Prevent reserved names (Windows)
    reserved_names = {'CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 
                     'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 
                     'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'}
    
    name_without_ext = Path(filename).stem.upper()
    if name_without_ext in reserved_names:
        filename = f"file_{filename}"
    
    # Limit filename length
    if len(filename) > 255:
        name = Path(filename).stem[:200]
        ext = Path(filename).suffix
        filename = f"{name}{ext}"
    
    return filename

def validate_file_extension(filename: str) -> None:
    """Validate file extension"""
    file_ext = Path(filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type not allowed. Only {', '.join(ALLOWED_EXTENSIONS)} files are permitted."
        )

def validate_file_size(content: bytes) -> None:
    """Validate file size"""
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large. Maximum size is {MAX_FILE_SIZE // (1024*1024)}MB."
        )
    
    if len(content) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file not allowed."
        )

def validate_mime_type(content: bytes) -> None:
    """Validate MIME type using python-magic"""
    try:
        mime_type = magic.from_buffer(content, mime=True)
        if mime_type not in ALLOWED_MIME_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid file type. Expected XML/GPX file, got {mime_type}."
            )
    except Exception as e:
        # If magic fails, try basic validation
        if not content.startswith(b'<?xml') and not content.startswith(b'<gpx'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File does not appear to be a valid XML/GPX file."
            )

async def validate_gpx_content(content: bytes) -> None:
    """Validate GPX XML content"""
    try:
        # Parse XML to ensure it's valid
        root = ET.fromstring(content)
        
        # Check if it's a GPX file
        if not (root.tag.endswith('gpx') or 'gpx' in root.tag.lower()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File is not a valid GPX file."
            )
        
        # Basic GPX structure validation
        namespaces = {'gpx': 'http://www.topografix.com/GPX/1/1'}
        
        # Check for tracks or routes (at least one should exist)
        tracks = root.findall('.//gpx:trk', namespaces) or root.findall('.//trk')
        routes = root.findall('.//gpx:rte', namespaces) or root.findall('.//rte')
        waypoints = root.findall('.//gpx:wpt', namespaces) or root.findall('.//wpt')
        
        if not (tracks or routes or waypoints):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GPX file contains no tracks, routes, or waypoints."
            )
            
    except ET.ParseError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid XML structure: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"GPX validation failed: {str(e)}"
        )

async def secure_file_upload(file: UploadFile) -> Tuple[str, str]:
    """
    Securely handle file upload with comprehensive validation
    Returns: (secure_filename, temp_file_path)
    """
    # Validate filename exists
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Filename is required"
        )
    
    # Validate file extension
    validate_file_extension(file.filename)
    
    # Read file content
    content = await file.read()
    await file.seek(0)  # Reset file pointer
    
    # Validate file size
    validate_file_size(content)
    
    # Validate MIME type
    validate_mime_type(content)
    
    # Validate GPX content
    await validate_gpx_content(content)
    
    # Generate secure filename
    sanitized_filename = sanitize_filename(file.filename)
    unique_filename = f"{uuid.uuid4()}_{sanitized_filename}"
    
    # Create secure file path (within upload directory only)
    temp_file_path = UPLOAD_DIR / unique_filename
    
    # Ensure path is within upload directory (prevent directory traversal)
    try:
        temp_file_path.resolve().relative_to(UPLOAD_DIR.resolve())
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file path"
        )
    
    return unique_filename, str(temp_file_path)

def cleanup_temp_file(file_path: str) -> None:
    """Safely remove temporary file"""
    try:
        path = Path(file_path)
        if path.exists() and path.is_file():
            # Ensure it's within uploads directory
            path.resolve().relative_to(UPLOAD_DIR.resolve())
            path.unlink()
    except Exception as e:
        # Log error but don't raise - cleanup is best effort
        print(f"Warning: Failed to cleanup temp file {file_path}: {e}")

# Rate limiting helpers (for use with middleware)
class RateLimitConfig:
    REQUESTS_PER_MINUTE = 60
    UPLOAD_REQUESTS_PER_HOUR = 10
    MAX_CONCURRENT_UPLOADS = 3