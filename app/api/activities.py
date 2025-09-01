from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import desc, func, text
from typing import List, Optional
import tempfile
import os

from ..core.database import get_sync_session
from ..models.activity import Activity
from ..models.trackpoint import Trackpoint
from ..services.gpx_service import GPXService

router = APIRouter(prefix="/api/v1/activities", tags=["activities"])

@router.get("/")
async def get_activities():
    """Get list of all activities"""
    with get_sync_session() as db:
        activities = db.query(Activity).order_by(desc(Activity.start_time)).all()
        
        return [{
            "id": activity.id,
            "name": activity.name,
            "activity_type": activity.activity_type,
            "start_time": activity.start_time.isoformat() if activity.start_time else None,
            "distance_km": float(activity.distance_km) if activity.distance_km else 0,
            "duration_seconds": activity.duration_seconds,
            "avg_heart_rate": activity.avg_heart_rate,
            "max_heart_rate": activity.max_heart_rate,
            "total_trackpoints": activity.total_trackpoints,
            "created_at": activity.created_at.isoformat() if activity.created_at else None
        } for activity in activities]

@router.get("/{activity_id}")
async def get_activity(activity_id: int):
    """Get specific activity details"""
    with get_sync_session() as db:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        return {
            "id": activity.id,
            "name": activity.name,
            "activity_type": activity.activity_type,
            "start_time": activity.start_time.isoformat() if activity.start_time else None,
            "duration_seconds": activity.duration_seconds,
            "distance_km": float(activity.distance_km) if activity.distance_km else 0,
            "elevation_gain_m": float(activity.elevation_gain_m) if activity.elevation_gain_m else 0,
            "elevation_loss_m": float(activity.elevation_loss_m) if activity.elevation_loss_m else 0,
            "avg_speed_ms": float(activity.avg_speed_ms) if activity.avg_speed_ms else 0,
            "max_speed_ms": float(activity.max_speed_ms) if activity.max_speed_ms else 0,
            "avg_heart_rate": activity.avg_heart_rate,
            "max_heart_rate": activity.max_heart_rate,
            "min_heart_rate": activity.min_heart_rate,
            "total_trackpoints": activity.total_trackpoints,
            "valid_hr_trackpoints": activity.valid_hr_trackpoints,
            "gpx_file_path": activity.gpx_file_path,
            "created_at": activity.created_at.isoformat() if activity.created_at else None,
            "updated_at": activity.updated_at.isoformat() if activity.updated_at else None
        }

@router.post("/upload")
async def upload_gpx(file: UploadFile = File(...)):
    """Upload and import GPX file"""
    
    # Validate file type
    if not file.filename.lower().endswith('.gpx'):
        raise HTTPException(status_code=400, detail="Only GPX files are allowed")
    
    # Check for duplicate file path (basic duplicate detection)
    temp_path = f"uploads/{file.filename}"
    
    with get_sync_session() as db:
        existing = db.query(Activity).filter(Activity.gpx_file_path == temp_path).first()
        if existing:
            raise HTTPException(
                status_code=409, 
                detail=f"File already imported as activity ID {existing.id}"
            )
    
    try:
        # Save uploaded file temporarily
        os.makedirs("uploads", exist_ok=True)
        temp_file_path = f"uploads/{file.filename}"
        
        with open(temp_file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Import using GPX service
        with get_sync_session() as db:
            service = GPXService(db)
            activity = service.import_gpx_file(temp_file_path, user_id=1)  # Default user for now
            
            return {
                "success": True,
                "activity_id": activity.id,
                "message": f"Successfully imported {activity.name}",
                "stats": {
                    "distance_km": float(activity.distance_km) if activity.distance_km else 0,
                    "duration_seconds": activity.duration_seconds,
                    "trackpoints": activity.total_trackpoints,
                    "avg_heart_rate": activity.avg_heart_rate
                }
            }
            
    except Exception as e:
        # Clean up file on error
        if os.path.exists(temp_file_path):
            os.unlink(temp_file_path)
        
        raise HTTPException(status_code=400, detail=f"Failed to import GPX: {str(e)}")

@router.delete("/{activity_id}")
async def delete_activity(activity_id: int):
    """Delete activity and its trackpoints"""
    with get_sync_session() as db:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Delete associated file if it exists
        if activity.gpx_file_path and os.path.exists(activity.gpx_file_path):
            os.unlink(activity.gpx_file_path)
        
        db.delete(activity)  # Cascade will delete trackpoints
        db.commit()
        
        return {"success": True, "message": f"Deleted activity {activity.name}"}

@router.get("/{activity_id}/trackpoints")
async def get_activity_trackpoints(activity_id: int, limit: Optional[int] = None):
    """Get GPS trackpoints for map visualization"""
    with get_sync_session() as db:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        query = db.query(Trackpoint).filter(
            Trackpoint.activity_id == activity_id,
            Trackpoint.exclude_from_gps_analysis == False
        ).order_by(Trackpoint.point_order)
        
        if limit:
            query = query.limit(limit)
            
        trackpoints = query.all()
        
        result = []
        for tp in trackpoints:
            # Extract coordinates from PostGIS geometry
            coords_query = db.execute(
                text("SELECT ST_Y(coordinates) as lat, ST_X(coordinates) as lng FROM trackpoints WHERE id = :tp_id"),
                {"tp_id": tp.id}
            ).fetchone()
            
            result.append({
                "point_order": tp.point_order,
                "latitude": float(coords_query.lat) if coords_query else None,
                "longitude": float(coords_query.lng) if coords_query else None,
                "elevation": float(tp.elevation) if tp.elevation else None,
                "recorded_at": tp.recorded_at.isoformat() if tp.recorded_at else None,
                "heart_rate": tp.heart_rate,
                "speed_ms": float(tp.speed_ms) if tp.speed_ms else None
            })
        
        return result

@router.get("/{activity_id}/heart-rate")
async def get_activity_heart_rate(activity_id: int):
    """Get heart rate data for chart visualization"""
    with get_sync_session() as db:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        trackpoints = db.query(Trackpoint).filter(
            Trackpoint.activity_id == activity_id,
            Trackpoint.heart_rate.isnot(None)
        ).order_by(Trackpoint.point_order).all()
        
        return {
            "activity_id": activity_id,
            "total_points": len(trackpoints),
            "data": [{
                "time_seconds": (tp.recorded_at - trackpoints[0].recorded_at).total_seconds() if tp.recorded_at and trackpoints[0].recorded_at else 0,
                "heart_rate": tp.heart_rate,
                "point_order": tp.point_order,
                "excluded": tp.exclude_from_hr_analysis,
                "exclusion_reason": tp.exclusion_reason
            } for tp in trackpoints],
            "stats": {
                "avg_hr": activity.avg_heart_rate,
                "max_hr": activity.max_heart_rate,
                "min_hr": activity.min_heart_rate,
                "valid_hr_points": activity.valid_hr_trackpoints,
                "total_hr_points": len(trackpoints),
                "excluded_points": len([tp for tp in trackpoints if tp.exclude_from_hr_analysis]),
                "exclusion_breakdown": {
                    "hr_startup": len([tp for tp in trackpoints if tp.exclusion_reason == 'hr_startup']),
                    "hr_statistical_outlier": len([tp for tp in trackpoints if tp.exclusion_reason == 'hr_statistical_outlier']),
                    "other": len([tp for tp in trackpoints if tp.exclude_from_hr_analysis and tp.exclusion_reason not in ['hr_startup', 'hr_statistical_outlier']])
                }
            }
        }

@router.get("/{activity_id}/elevation")
async def get_activity_elevation(activity_id: int):
    """Get elevation profile for chart visualization"""
    with get_sync_session() as db:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        trackpoints = db.query(Trackpoint).filter(
            Trackpoint.activity_id == activity_id,
            Trackpoint.exclude_from_gps_analysis == False,
            Trackpoint.elevation.isnot(None)
        ).order_by(Trackpoint.point_order).all()
        
        # Calculate cumulative distance
        cumulative_distance = 0
        elevation_data = []
        
        for i, tp in enumerate(trackpoints):
            if i > 0:
                cumulative_distance += tp.distance_from_previous_m or 0
                
            elevation_data.append({
                "distance_km": round(cumulative_distance / 1000, 3),
                "elevation_m": float(tp.elevation),
                "point_order": tp.point_order
            })
        
        return {
            "activity_id": activity_id,
            "total_points": len(trackpoints),
            "data": elevation_data,
            "stats": {
                "elevation_gain_m": float(activity.elevation_gain_m) if activity.elevation_gain_m else None,
                "elevation_loss_m": float(activity.elevation_loss_m) if activity.elevation_loss_m else None,
                "total_distance_km": float(activity.distance_km) if activity.distance_km else 0
            }
        }