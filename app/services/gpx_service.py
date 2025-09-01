from sqlalchemy.orm import Session
from ..models.activity import Activity
from ..models.trackpoint import Trackpoint
import sys
import os
from pathlib import Path

# Import GPX parser from scripts
sys.path.append(str(Path(__file__).parent.parent.parent))
from scripts.import_gpx import GPXParser, GPXImporter

class GPXService:
    def __init__(self, db: Session):
        self.db = db
        self.parser = GPXParser()
    
    def import_gpx_file(self, file_path: str, user_id: int = 1) -> Activity:
        """Import GPX file using existing parser logic"""
        
        # Use existing GPXImporter from CLI script
        importer = GPXImporter(self.db)
        activity = importer.import_file(file_path, user_id)
        
        return activity
    
    def get_activities_feed(self, limit: int = 20, offset: int = 0):
        """Get activities feed with pagination"""
        
        activities = (
            self.db.query(Activity)
            .order_by(Activity.start_time.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        
        return activities