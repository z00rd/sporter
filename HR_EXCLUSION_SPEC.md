# HR Exclusion System Implementation Specification

## Overview
Implement a hybrid HR exclusion system that combines automatic point-level exclusions with user-defined time-range exclusions.

## Core Concept
- **Automatic point exclusions**: Individual trackpoints marked as excluded by algorithm (current system) - shown as red dots
- **User range exclusions**: Time-based ranges that exclude ALL points within the range (new feature) - shown as overlay bands
- A trackpoint is excluded if EITHER condition is true
- **User interface**: Users can only create/manage ranges. Automatic exclusions are system-managed.
- **Database**: Ready to store both types for future expansion

## Database Schema

### New Table: `exclusion_ranges`
```sql
CREATE TABLE exclusion_ranges (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER NOT NULL REFERENCES activities(id) ON DELETE CASCADE,
    start_time_seconds INTEGER NOT NULL,  -- seconds from activity start
    end_time_seconds INTEGER NOT NULL,    -- seconds from activity start
    reason VARCHAR(100),                  -- user-provided reason
    exclusion_type VARCHAR(20) DEFAULT 'user_range', -- 'user_range', 'auto_point', 'user_point' (future)
    created_at TIMESTAMP DEFAULT now(),
    UNIQUE(activity_id, start_time_seconds, end_time_seconds, exclusion_type)
);
```

### Update Trackpoint Logic
Keep existing `exclude_from_hr_analysis` and `exclusion_reason` fields.

## API Endpoints

### Get HR Data (Update existing)
`GET /activities/{id}/heart-rate`
- Include range exclusions in calculation
- Response includes both point and range exclusion info

### Range Management
```
POST /activities/{id}/hr-exclusions/ranges
Body: { start_time_seconds: 120, end_time_seconds: 300, reason: "Bad sensor" }

GET /activities/{id}/hr-exclusions/ranges
Returns: [{ id, start_time_seconds, end_time_seconds, reason, points_affected }]

DELETE /activities/{id}/hr-exclusions/ranges/{range_id}

POST /activities/{id}/hr-exclusions/clear-all  # clears both points AND ranges
POST /activities/{id}/hr-exclusions/reapply-auto  # keeps user ranges, re-runs automatic detection
```

## Business Logic

### Exclusion Calculation
```python
def is_trackpoint_excluded(trackpoint, exclusion_ranges):
    # Check individual point exclusion
    if trackpoint.exclude_from_hr_analysis:
        return True, trackpoint.exclusion_reason
    
    # Check range exclusions
    point_time = (trackpoint.recorded_at - activity_start).total_seconds()
    for range in exclusion_ranges:
        if range.start_time_seconds <= point_time <= range.end_time_seconds:
            return True, f"Range: {range.reason}"
    
    return False, None
```

### Auto-Detection Process (Re-run Auto)
1. Clear all automatic exclusions (`exclude_from_hr_analysis = False` where `exclusion_reason IN ('hr_startup', 'hr_statistical_outlier')`)
2. Keep all user range exclusions 
3. Re-run automatic detection (startup + statistical outliers) ONLY on points NOT excluded by user ranges
4. Skip auto-detection for any point that falls within a user range exclusion
5. Recalculate activity stats considering BOTH automatic point and user range exclusions

## Frontend Implementation

### Exclusion Ranges UI
- **Automatic Exclusions Summary**: Read-only info panel
  - "15 points excluded automatically (8 startup, 7 outliers)"
  - Actions: [Clear All Auto] [Re-run Detection]

- **User Ranges Section**: Manually created ranges only
  - "Bad sensor: 12:00-15:00 (180 points excluded)"  
  - Actions: [Edit] [Delete] per range, [Add New Range]

### Chart Integration
- **Included HR points**: Black line/dots
- **Excluded HR points (automatic)**: Red crosses/dots  
- **Range exclusions**: Semi-transparent red overlay bands
- Tooltip shows exclusion reason: "Excluded: Range - Bad sensor" or "Excluded: Startup anomaly"

### Management Actions
1. **Add Range**: Time picker dialog (MM:SS.ms format, ms optional) + reason text
2. **Delete Range**: Confirmation dialog, recalculates stats (user ranges only)
3. **Clear All Auto**: Removes ALL automatic point exclusions, keeps user ranges
4. **Re-run Auto**: Re-applies automatic detection ONLY to points not excluded by user ranges
5. **Edit Range**: Modify time bounds or reason (user ranges only)

**Deletion Capabilities:**
- ✅ Clear all automatic exclusions (bulk only)  
- ✅ Delete individual user ranges
- ❌ Cannot delete individual automatic exclusions

## User Workflow Examples

### Scenario 1: Fix bad sensor period
1. User sees spiky HR data from 12:00-15:00
2. Clicks "Add Exclusion Range" 
3. Sets start: 12:00, end: 15:00, reason: "HR sensor malfunction"
4. All 180 points in that timeframe are excluded from analysis
5. Activity stats update immediately

### Scenario 2: Clean up over-aggressive auto-detection  
1. Auto-detection excluded too many startup points
2. User clicks "Clear All Auto" to remove automatic exclusions
3. User manually adds specific range: 0:00-1:00 "Warm-up period"
4. Clicks "Re-run Auto" to re-apply outlier detection to remaining data

### Scenario 3: Handle single outlier
1. User sees one bad point at 8:30 (165 bpm spike) not caught by auto-detection
2. User creates small range: 8:29-8:31, reason: "Sensor spike"  
3. Range excludes the problematic point and nearby data
4. Alternative: Wait for future individual point exclusion feature

---

## Answered Questions:

1. ~~**System ranges display**: Should we auto-group consecutive automatic exclusions into visual "ranges" for display, or show them as individual points?~~
   → **ANSWER**: Keep separate. Auto exclusions = red dots, user exclusions = ranges only.

2. **Range overlap handling**: What happens if user creates overlapping ranges or a range that includes already-excluded individual points?
   → **DECISION**: Allow overlap. A point excluded multiple times is still just excluded. No UI issues.

3. ~~**Individual point exclusions**: Should users be able to exclude/include individual points via chart interaction, or only through ranges?~~
   → **ANSWER**: Ranges only for now. Database ready for future point exclusions.

4. ~~**Range precision**: Time input as MM:SS or more granular (MM:SS.milliseconds)?~~
   → **ANSWER**: MM:SS.ms format, milliseconds optional.

5. ~~**Bulk operations**: Should there be "Select multiple ranges and delete" functionality?~~
   → **ANSWER**: No bulk operations.

## Current Status
- Automatic point exclusions: ✅ Implemented (startup detection + statistical outliers)
- Range exclusions: ❌ Not implemented (frontend UI exists but no backend)
- Frontend displays existing exclusions as "ranges" but they're just visual groupings
- Need to implement the full range-based exclusion system per this specification