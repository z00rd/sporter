#!/usr/bin/env python3

import argparse
import sys
import os
from pathlib import Path
from datetime import datetime
import xml.etree.ElementTree as ET
from decimal import Decimal
from typing import List, Dict, Optional, Tuple

# Add app to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.models.activity import Activity
from app.models.trackpoint import Trackpoint

class GPXParser:
    def __init__(self):
        self.ns = {
            'gpx': 'http://www.topografix.com/GPX/1/1',
            'gpxtpx': 'http://www.garmin.com/xmlschemas/TrackPointExtension/v1',
            'gpxdata': 'http://www.cluetrust.com/XML/GPXDATA/1/0'
        }
    
    def parse_file(self, gpx_path: str) -> Dict:
        """Parse GPX file and return structured data"""
        tree = ET.parse(gpx_path)
        root = tree.getroot()
        
        # Find track
        track = root.find('.//gpx:trk', self.ns)
        if track is None:
            raise ValueError("No track found in GPX file")
        
        # Extract activity metadata
        activity_data = self._extract_activity_metadata(track, gpx_path)
        
        # Extract trackpoints
        trackpoints_data = self._extract_trackpoints(track)
        
        if not trackpoints_data:
            raise ValueError("No trackpoints found in GPX file")
        
        # Calculate derived metrics
        self._calculate_metrics(activity_data, trackpoints_data)
        
        return {
            'activity': activity_data,
            'trackpoints': trackpoints_data
        }
    
    def _extract_activity_metadata(self, track, gpx_path: str) -> Dict:
        """Extract basic activity information"""
        name_elem = track.find('gpx:name', self.ns)
        activity_name = name_elem.text if name_elem is not None else Path(gpx_path).stem
        
        # Auto-detect activity type
        activity_type = self._detect_activity_type(track, activity_name, gpx_path)
        
        return {
            'name': activity_name,
            'activity_type': activity_type,
            'gpx_file_path': str(gpx_path)
        }
    
    def _extract_trackpoints(self, track) -> List[Dict]:
        """Extract all trackpoints from track segments"""
        trackpoints = []
        point_order = 0
        
        for segment in track.findall('.//gpx:trkseg', self.ns):
            for point in segment.findall('gpx:trkpt', self.ns):
                trackpoint_data = self._parse_trackpoint(point, point_order)
                if trackpoint_data:
                    trackpoints.append(trackpoint_data)
                    point_order += 1
        
        return trackpoints
    
    def _parse_trackpoint(self, point, point_order: int) -> Optional[Dict]:
        """Parse individual trackpoint"""
        try:
            lat = Decimal(point.get('lat'))
            lon = Decimal(point.get('lon'))
            
            # Time is required
            time_elem = point.find('gpx:time', self.ns)
            if time_elem is None:
                return None
            
            recorded_at = datetime.fromisoformat(time_elem.text.replace('Z', '+00:00'))
            
            # Optional elevation
            elevation = None
            ele_elem = point.find('gpx:ele', self.ns)
            if ele_elem is not None:
                elevation = Decimal(str(ele_elem.text))
            
            # Heart rate from extensions
            heart_rate = None
            extensions = point.find('gpx:extensions', self.ns)
            if extensions is not None:
                # Try Garmin format first
                hr_elem = extensions.find('.//gpxtpx:hr', self.ns)
                if hr_elem is not None:
                    heart_rate = int(hr_elem.text)
                else:
                    # Try other formats
                    hr_elem = extensions.find('.//gpxdata:hr', self.ns)
                    if hr_elem is not None:
                        heart_rate = int(hr_elem.text)
            
            return {
                'point_order': point_order,
                'longitude': lon,
                'latitude': lat,
                'elevation': elevation,
                'recorded_at': recorded_at,
                'heart_rate': heart_rate
            }
            
        except (ValueError, TypeError) as e:
            print(f"Warning: Failed to parse trackpoint {point_order}: {e}")
            return None
    
    def _calculate_metrics(self, activity_data: Dict, trackpoints_data: List[Dict]):
        """Calculate derived metrics for activity and trackpoints"""
        if not trackpoints_data:
            return
        
        # Activity level metrics
        activity_data['start_time'] = trackpoints_data[0]['recorded_at']
        activity_data['total_trackpoints'] = len(trackpoints_data)
        
        # Calculate duration
        end_time = trackpoints_data[-1]['recorded_at']
        duration = (end_time - activity_data['start_time']).total_seconds()
        activity_data['duration_seconds'] = int(duration)
        
        # Calculate heart rate metrics with outlier detection
        self._detect_hr_outliers(trackpoints_data)
        
        # Calculate HR metrics excluding outliers
        valid_hr_values = [
            tp['heart_rate'] for tp in trackpoints_data 
            if tp['heart_rate'] is not None and not tp.get('exclude_from_hr_analysis', False)
        ]
        
        if valid_hr_values:
            activity_data['avg_heart_rate'] = int(sum(valid_hr_values) / len(valid_hr_values))
            activity_data['max_heart_rate'] = max(valid_hr_values)
            activity_data['min_heart_rate'] = min(valid_hr_values)
            activity_data['valid_hr_trackpoints'] = len(valid_hr_values)
        else:
            activity_data['valid_hr_trackpoints'] = 0
        
        # Calculate distance and speed metrics
        total_distance = 0
        speeds = []
        
        for i in range(1, len(trackpoints_data)):
            prev_tp = trackpoints_data[i-1]
            curr_tp = trackpoints_data[i]
            
            # Calculate distance between points (simplified)
            distance = self._calculate_distance(
                prev_tp['latitude'], prev_tp['longitude'],
                curr_tp['latitude'], curr_tp['longitude']
            )
            
            curr_tp['distance_from_previous_m'] = distance
            total_distance += distance
            
            # Calculate time gap
            time_diff = (curr_tp['recorded_at'] - prev_tp['recorded_at']).total_seconds()
            curr_tp['time_gap_seconds'] = int(time_diff)
            
            # Calculate speed
            if time_diff > 0 and distance > 0:
                speed_ms = distance / time_diff
                curr_tp['speed_ms'] = Decimal(str(round(speed_ms, 3)))
                speeds.append(speed_ms)
        
        # Activity distance and speed
        activity_data['distance_km'] = Decimal(str(round(total_distance / 1000, 3)))
        if speeds:
            activity_data['avg_speed_ms'] = Decimal(str(round(sum(speeds) / len(speeds), 3)))
            activity_data['max_speed_ms'] = Decimal(str(round(max(speeds), 3)))
    
    def _calculate_distance(self, lat1: Decimal, lon1: Decimal, lat2: Decimal, lon2: Decimal) -> float:
        """Calculate distance between two points using Haversine formula (in meters)"""
        from math import radians, sin, cos, sqrt, atan2
        
        lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
        
        R = 6371000  # Earth radius in meters
        
        dlat = radians(lat2 - lat1)
        dlon = radians(lon2 - lon1)
        
        a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        
        return R * c
    
    def _detect_activity_type(self, track, activity_name: str, gpx_path: str) -> str:
        """Auto-detect activity type from GPX metadata, filename, and movement patterns"""
        
        # 1. Check GPX metadata/extensions first
        activity_type = self._get_activity_type_from_metadata(track)
        if activity_type:
            return activity_type
        
        # 2. Check filename patterns
        activity_type = self._get_activity_type_from_filename(activity_name, gpx_path)
        if activity_type:
            return activity_type
        
        # 3. Default fallback
        return 'running'
    
    def _get_activity_type_from_metadata(self, track) -> str:
        """Extract activity type from GPX metadata and extensions"""
        
        # Check Garmin extensions
        for ext in track.findall('.//gpxtpx:TrackPointExtension', self.ns):
            # Some Garmin devices store sport type
            sport = ext.find('gpxtpx:sport', self.ns)
            if sport is not None:
                return self._normalize_activity_type(sport.text)
        
        # Check generic GPX type attribute
        type_elem = track.find('gpx:type', self.ns)
        if type_elem is not None:
            return self._normalize_activity_type(type_elem.text)
        
        # Note: We'll skip root metadata check for now since it's complex 
        # with ElementTree and the most useful info is usually in track elements anyway
        
        return None
    
    def _get_activity_type_from_filename(self, activity_name: str, gpx_path: str) -> str:
        """Extract activity type from filename patterns"""
        
        # Combine name and path for analysis
        full_text = f"{activity_name} {gpx_path}".lower()
        
        # Common patterns in filenames
        if any(keyword in full_text for keyword in ['swim', 'swimming', 'pool', 'open-water']):
            return 'swimming'
        elif any(keyword in full_text for keyword in ['bike', 'biking', 'cycling', 'cycle', 'mtb']):
            return 'cycling'  
        elif any(keyword in full_text for keyword in ['run', 'running', 'jog', 'jogging']):
            return 'running'
        elif any(keyword in full_text for keyword in ['walk', 'walking', 'hike', 'hiking']):
            return 'walking'
        elif any(keyword in full_text for keyword in ['ski', 'skiing', 'nordic']):
            return 'skiing'
        elif any(keyword in full_text for keyword in ['kayak', 'canoe', 'paddle']):
            return 'paddling'
        
        return None
    
    def _normalize_activity_type(self, raw_type: str) -> str:
        """Normalize activity type to our standard types"""
        if not raw_type:
            return None
            
        raw_type = raw_type.lower().strip()
        
        # Map various formats to our standard types
        type_mapping = {
            # Running variations
            'running': 'running', 'run': 'running', 'jog': 'running', 'jogging': 'running',
            'trail_running': 'running', 'treadmill': 'running',
            
            # Cycling variations  
            'cycling': 'cycling', 'bike': 'cycling', 'biking': 'cycling', 'bicycle': 'cycling',
            'mountain_biking': 'cycling', 'road_cycling': 'cycling', 'mtb': 'cycling',
            
            # Swimming variations
            'swimming': 'swimming', 'swim': 'swimming', 'pool_swimming': 'swimming', 
            'open_water_swimming': 'swimming', 'openwater': 'swimming',
            
            # Walking variations
            'walking': 'walking', 'walk': 'walking', 'hiking': 'walking', 'hike': 'walking',
            'trekking': 'walking', 'trek': 'walking',
            
            # Other activities
            'skiing': 'skiing', 'ski': 'skiing', 'nordic_skiing': 'skiing',
            'kayaking': 'paddling', 'kayak': 'paddling', 'canoeing': 'paddling', 'canoe': 'paddling',
            'paddling': 'paddling', 'paddle': 'paddling'
        }
        
        return type_mapping.get(raw_type, raw_type)
    
    def _detect_hr_outliers(self, trackpoints_data: List[Dict]):
        """Mark HR outliers for exclusion from analysis"""
        hr_trackpoints = [tp for tp in trackpoints_data if tp['heart_rate'] is not None]
        
        if len(hr_trackpoints) < 10:  # Not enough data for outlier detection
            return
        
        # Calculate overall average HR for the entire activity
        overall_avg_hr = sum(tp['heart_rate'] for tp in hr_trackpoints) / len(hr_trackpoints)
        
        # Strategy 1: Smart startup exclusion - exclude points in first 5 minutes that are above overall average
        startup_minutes = 5  # Look at first 5 minutes
        start_time = trackpoints_data[0]['recorded_at']
        
        for tp in hr_trackpoints:
            time_since_start = (tp['recorded_at'] - start_time).total_seconds()
            
            if time_since_start < startup_minutes * 60:
                # In first 5 minutes: exclude only if HR > overall average (likely sensor errors/spikes)
                if tp['heart_rate'] > overall_avg_hr:
                    tp['exclude_from_hr_analysis'] = True
                    tp['exclusion_reason'] = 'hr_startup'
                else:
                    tp['exclude_from_hr_analysis'] = False  # Keep normal warm-up HR
            else:
                tp['exclude_from_hr_analysis'] = False
        
        # Strategy 2: Statistical outliers (after startup period)
        valid_hr_values = [
            tp['heart_rate'] for tp in hr_trackpoints 
            if not tp.get('exclude_from_hr_analysis', False)
        ]
        
        if len(valid_hr_values) > 20:
            import statistics
            
            median_hr = statistics.median(valid_hr_values)
            mad = statistics.median([abs(hr - median_hr) for hr in valid_hr_values])
            
            # Mark extreme outliers (beyond 3 MAD from median)
            threshold = 3 * mad if mad > 0 else 50  # fallback threshold
            
            for tp in hr_trackpoints:
                if tp.get('exclude_from_hr_analysis', False):
                    continue  # Already excluded
                
                if abs(tp['heart_rate'] - median_hr) > threshold:
                    tp['exclude_from_hr_analysis'] = True
                    if tp.get('exclusion_reason') != 'hr_startup':
                        tp['exclusion_reason'] = 'hr_statistical_outlier'
        
        excluded_count = sum(1 for tp in hr_trackpoints if tp.get('exclude_from_hr_analysis', False))
        total_hr_count = len(hr_trackpoints)
        
        print(f"HR outlier detection: excluded {excluded_count}/{total_hr_count} trackpoints")
        if excluded_count > 0:
            startup_excluded = sum(1 for tp in hr_trackpoints 
                                 if tp.get('exclusion_reason') == 'hr_startup')
            outlier_excluded = sum(1 for tp in hr_trackpoints 
                                 if tp.get('exclusion_reason') == 'hr_statistical_outlier')
            print(f"  - Startup period: {startup_excluded}")
            print(f"  - Statistical outliers: {outlier_excluded}")

class GPXImporter:
    def __init__(self, db_session: Session):
        self.db = db_session
        self.parser = GPXParser()
    
    def import_file(self, gpx_path: str, user_id: int = 1) -> Activity:
        """Import GPX file to database"""
        print(f"Parsing GPX file: {gpx_path}")
        
        # Parse GPX
        data = self.parser.parse_file(gpx_path)
        
        # Create Activity record
        activity = Activity(
            user_id=user_id,
            name=data['activity']['name'],
            activity_type=data['activity']['activity_type'],
            start_time=data['activity']['start_time'],
            duration_seconds=data['activity']['duration_seconds'],
            distance_km=data['activity'].get('distance_km'),
            avg_speed_ms=data['activity'].get('avg_speed_ms'),
            max_speed_ms=data['activity'].get('max_speed_ms'),
            avg_heart_rate=data['activity'].get('avg_heart_rate'),
            max_heart_rate=data['activity'].get('max_heart_rate'),
            min_heart_rate=data['activity'].get('min_heart_rate'),
            gpx_file_path=data['activity']['gpx_file_path'],
            total_trackpoints=data['activity']['total_trackpoints'],
            valid_hr_trackpoints=data['activity'].get('valid_hr_trackpoints', 0)
        )
        
        self.db.add(activity)
        self.db.flush()  # Get activity.id
        
        print(f"Created activity: {activity.name} (ID: {activity.id})")
        
        # Create Trackpoints
        trackpoints = []
        for tp_data in data['trackpoints']:
            trackpoint = Trackpoint(
                activity_id=activity.id,
                point_order=tp_data['point_order'],
                coordinates=f"POINT({tp_data['longitude']} {tp_data['latitude']})",
                elevation=tp_data.get('elevation'),
                recorded_at=tp_data['recorded_at'],
                heart_rate=tp_data.get('heart_rate'),
                speed_ms=tp_data.get('speed_ms'),
                distance_from_previous_m=tp_data.get('distance_from_previous_m'),
                time_gap_seconds=tp_data.get('time_gap_seconds'),
                exclude_from_hr_analysis=tp_data.get('exclude_from_hr_analysis', False),
                exclusion_reason=tp_data.get('exclusion_reason')
            )
            trackpoints.append(trackpoint)
        
        self.db.bulk_save_objects(trackpoints)
        self.db.commit()
        
        print(f"Imported {len(trackpoints)} trackpoints")
        print(f"Activity summary: {activity.distance_km}km in {activity.duration_seconds}s")
        if activity.avg_heart_rate:
            print(f"Heart rate: {activity.avg_heart_rate} avg, {activity.max_heart_rate} max")
        
        return activity

def main():
    parser = argparse.ArgumentParser(description='Import GPX file to database')
    parser.add_argument('--file', required=True, help='Path to GPX file')
    parser.add_argument('--user-id', type=int, default=1, help='User ID to assign activity')
    
    args = parser.parse_args()
    
    if not os.path.exists(args.file):
        print(f"Error: GPX file not found: {args.file}")
        sys.exit(1)
    
    try:
        # Direct database connection for CLI
        print("Attempting database connection to postgresql+psycopg2://dev:***@127.0.0.1:5432/sporter")
        # Try different connection methods
        for host in ["127.0.0.1", "localhost"]:
            try:
                print(f"Trying connection to {host}...")
                test_engine = create_engine(f"postgresql+psycopg2://dev:dev@{host}:5432/sporter", echo=False)
                with test_engine.connect() as conn:
                    result = conn.execute("SELECT 1")
                    print(f"Success with {host}")
                    engine = test_engine
                    break
            except Exception as e:
                print(f"Failed with {host}: {e}")
        else:
            raise Exception("Could not connect with any host variant")
        
        # Test connection first
        with engine.connect() as conn:
            result = conn.execute("SELECT version()")
            print(f"Database connection successful: {result.fetchone()[0][:50]}...")
        
        SessionLocal = sessionmaker(bind=engine)
        
        with SessionLocal() as db:
            importer = GPXImporter(db)
            activity = importer.import_file(args.file, args.user_id)
            print(f"✅ Successfully imported activity ID: {activity.id}")
            
    except Exception as e:
        print(f"❌ Error importing GPX: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()