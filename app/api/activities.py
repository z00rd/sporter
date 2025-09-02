from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
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
async def get_activities(user_id: Optional[int] = None):
    """Get list of activities, optionally filtered by user_id"""
    with get_sync_session() as db:
        query = db.query(Activity)
        
        if user_id:
            query = query.filter(Activity.user_id == user_id)
            
        activities = query.order_by(desc(Activity.start_time)).all()
        
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
async def upload_gpx(file: UploadFile = File(...), user_id: Optional[int] = Form(None)):
    """Upload and import GPX file"""
    
    # Validate file type
    if not file.filename.lower().endswith('.gpx'):
        raise HTTPException(status_code=400, detail="Only GPX files are allowed")
    
    with get_sync_session() as db:
        # Get the target user (from parameter or default)
        from ..models.user import User
        if user_id:
            target_user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
            if not target_user:
                raise HTTPException(status_code=404, detail="User not found")
        else:
            target_user = db.query(User).filter(User.is_active == True).first()
            if not target_user:
                raise HTTPException(status_code=500, detail="No active users found")
        
        # Check for duplicate file path (per-user duplicate detection)
        temp_path = f"uploads/{file.filename}"
        existing = db.query(Activity).filter(
            Activity.gpx_file_path == temp_path,
            Activity.user_id == target_user.id
        ).first()
        if existing:
            raise HTTPException(
                status_code=409, 
                detail=f"File '{file.filename}' already imported as activity ID {existing.id}"
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
            activity = service.import_gpx_file(temp_file_path, user_id=target_user.id)
            
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
    """Get GPS trackpoints for map visualization - OPTIMIZED"""
    with get_sync_session() as db:
        # Check if activity exists
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Single optimized query with PostGIS functions
        query_sql = """
            SELECT 
                point_order,
                ST_Y(coordinates) as latitude,
                ST_X(coordinates) as longitude,
                elevation,
                recorded_at,
                heart_rate,
                speed_ms
            FROM trackpoints 
            WHERE activity_id = :activity_id 
            AND exclude_from_gps_analysis = false
            ORDER BY point_order
        """
        
        # Add limit if specified
        if limit:
            query_sql += " LIMIT :limit"
        
        # Execute single query
        params = {"activity_id": activity_id}
        if limit:
            params["limit"] = limit
            
        result_rows = db.execute(text(query_sql), params).fetchall()
        
        # Transform to response format
        return [{
            "point_order": row.point_order,
            "latitude": float(row.latitude) if row.latitude else None,
            "longitude": float(row.longitude) if row.longitude else None,
            "elevation": float(row.elevation) if row.elevation else None,
            "recorded_at": row.recorded_at.isoformat() if row.recorded_at else None,
            "heart_rate": row.heart_rate,
            "speed_ms": float(row.speed_ms) if row.speed_ms else None
        } for row in result_rows]

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

@router.post("/{activity_id}/hr-exclusions/clear")
async def clear_hr_exclusions(activity_id: int):
    """Clear all HR exclusions for an activity"""
    with get_sync_session() as db:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Clear all HR exclusions
        trackpoints = db.query(Trackpoint).filter(
            Trackpoint.activity_id == activity_id,
            Trackpoint.heart_rate.isnot(None)
        ).all()
        
        for tp in trackpoints:
            tp.exclude_from_hr_analysis = False
            tp.exclusion_reason = None
        
        db.commit()
        
        return {
            "success": True,
            "message": f"Cleared HR exclusions for activity {activity.name}",
            "cleared_trackpoints": len(trackpoints)
        }

@router.post("/{activity_id}/hr-exclusions/reapply")
async def reapply_hr_exclusions(activity_id: int):
    """Clear existing HR exclusions and reapply automatic detection"""
    import statistics
    from datetime import datetime
    
    with get_sync_session() as db:
        activity = db.query(Activity).filter(Activity.id == activity_id).first()
        if not activity:
            raise HTTPException(status_code=404, detail="Activity not found")
        
        # Get all trackpoints with HR data, ordered by time
        trackpoints = db.query(Trackpoint).filter(
            Trackpoint.activity_id == activity_id,
            Trackpoint.heart_rate.isnot(None)
        ).order_by(Trackpoint.point_order).all()
        
        if len(trackpoints) < 10:
            return {
                "success": False,
                "message": "Not enough HR data for exclusion analysis",
                "trackpoints_count": len(trackpoints)
            }
        
        # Clear existing exclusions
        for tp in trackpoints:
            tp.exclude_from_hr_analysis = False
            tp.exclusion_reason = None
        
        # Apply HR exclusion logic (same as in GPX import)
        
        # Calculate overall average HR for the entire activity
        overall_avg_hr = sum(tp.heart_rate for tp in trackpoints) / len(trackpoints)
        
        # Strategy 1: Smart startup exclusion - exclude points in first 5 minutes that are above overall average
        startup_minutes = 5
        start_time = trackpoints[0].recorded_at
        
        for tp in trackpoints:
            if tp.recorded_at and start_time:
                time_since_start = (tp.recorded_at - start_time).total_seconds()
                
                if time_since_start < startup_minutes * 60:
                    # In first 5 minutes: exclude only if HR > overall average
                    if tp.heart_rate > overall_avg_hr:
                        tp.exclude_from_hr_analysis = True
                        tp.exclusion_reason = 'hr_startup'
                    else:
                        tp.exclude_from_hr_analysis = False
                else:
                    tp.exclude_from_hr_analysis = False
        
        # Strategy 2: Statistical outliers (after startup period)
        valid_hr_values = [
            tp.heart_rate for tp in trackpoints 
            if not tp.exclude_from_hr_analysis
        ]
        
        if len(valid_hr_values) > 20:
            median_hr = statistics.median(valid_hr_values)
            mad = statistics.median([abs(hr - median_hr) for hr in valid_hr_values])
            
            # Mark extreme outliers (beyond 3 MAD from median)
            threshold = 3 * mad if mad > 0 else 50  # fallback threshold
            
            for tp in trackpoints:
                if tp.exclude_from_hr_analysis:
                    continue  # Already excluded
                
                if abs(tp.heart_rate - median_hr) > threshold:
                    tp.exclude_from_hr_analysis = True
                    if tp.exclusion_reason != 'hr_startup':
                        tp.exclusion_reason = 'hr_statistical_outlier'
        
        # Recalculate activity HR statistics
        valid_hr_trackpoints = [tp for tp in trackpoints if not tp.exclude_from_hr_analysis]
        
        if valid_hr_trackpoints:
            activity.avg_heart_rate = int(sum(tp.heart_rate for tp in valid_hr_trackpoints) / len(valid_hr_trackpoints))
            activity.max_heart_rate = max(tp.heart_rate for tp in valid_hr_trackpoints)
            activity.min_heart_rate = min(tp.heart_rate for tp in valid_hr_trackpoints)
            activity.valid_hr_trackpoints = len(valid_hr_trackpoints)
        
        db.commit()
        
        # Count exclusions
        excluded_count = sum(1 for tp in trackpoints if tp.exclude_from_hr_analysis)
        startup_excluded = sum(1 for tp in trackpoints if tp.exclusion_reason == 'hr_startup')
        outlier_excluded = sum(1 for tp in trackpoints if tp.exclusion_reason == 'hr_statistical_outlier')
        
        return {
            "success": True,
            "message": f"Reapplied HR exclusions for activity {activity.name}",
            "total_hr_trackpoints": len(trackpoints),
            "excluded_trackpoints": excluded_count,
            "startup_excluded": startup_excluded,
            "statistical_outliers": outlier_excluded,
            "updated_stats": {
                "avg_hr": activity.avg_heart_rate,
                "max_hr": activity.max_heart_rate,
                "min_hr": activity.min_heart_rate,
                "valid_hr_points": activity.valid_hr_trackpoints
            }
        }