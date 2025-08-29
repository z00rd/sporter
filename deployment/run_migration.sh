#!/bin/bash
# Run Alembic migrations via docker

set -e

echo "=== Running Alembic Migration ==="

# Copy migration files to container temporarily
docker-compose exec postgres mkdir -p /tmp/alembic/versions
docker cp alembic/versions/001_initial_schema.py sporter-postgres-1:/tmp/alembic/versions/

# Create alembic_version table and apply migration manually
docker-compose exec postgres psql -U dev -d sporter << 'EOF'

-- Create alembic version table if it doesn't exist
CREATE TABLE IF NOT EXISTS alembic_version (
    version_num VARCHAR(32) NOT NULL,
    CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
);

-- Check if migration already applied
DO $$
DECLARE
    version_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO version_count FROM alembic_version WHERE version_num = '001';
    
    IF version_count = 0 THEN
        -- Apply migration
        
        -- Create activities table
        CREATE TABLE activities (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255),
            activity_type VARCHAR(50),
            start_time TIMESTAMP WITH TIME ZONE,
            duration_seconds INTEGER,
            distance_km DECIMAL(8,3),
            elevation_gain_m DECIMAL(8,2),
            elevation_loss_m DECIMAL(8,2),
            max_speed_ms DECIMAL(6,3),
            avg_speed_ms DECIMAL(6,3),
            avg_heart_rate INTEGER,
            max_heart_rate INTEGER,
            min_heart_rate INTEGER,
            gpx_file_path VARCHAR(500),
            total_trackpoints INTEGER,
            valid_hr_trackpoints INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX ix_activities_id ON activities(id);

        -- Create trackpoints table
        CREATE TABLE trackpoints (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            point_order INTEGER NOT NULL,
            coordinates POINT NOT NULL,
            elevation DECIMAL(7,2),
            recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
            heart_rate INTEGER,
            cadence INTEGER,
            temperature DECIMAL(4,1),
            speed_ms DECIMAL(6,3),
            exclude_from_hr_analysis BOOLEAN DEFAULT FALSE,
            exclude_from_gps_analysis BOOLEAN DEFAULT FALSE,
            exclude_from_pace_analysis BOOLEAN DEFAULT FALSE,
            exclusion_reason TEXT,
            is_stationary BOOLEAN DEFAULT FALSE,
            distance_from_previous_m DECIMAL(8,3),
            time_gap_seconds INTEGER,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX ix_trackpoints_id ON trackpoints(id);
        CREATE INDEX idx_trackpoints_activity_order ON trackpoints(activity_id, point_order);
        CREATE INDEX idx_trackpoints_coordinates ON trackpoints USING GIST(coordinates);
        CREATE INDEX idx_trackpoints_recorded_at ON trackpoints(recorded_at);
        CREATE INDEX idx_trackpoints_hr_analysis ON trackpoints(activity_id, exclude_from_hr_analysis);

        -- Create analysis_segments table
        CREATE TABLE analysis_segments (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            segment_type VARCHAR(50),
            start_point_order INTEGER,
            end_point_order INTEGER,
            distance_km DECIMAL(8,3),
            duration_seconds INTEGER,
            avg_heart_rate INTEGER,
            avg_pace_min_per_km DECIMAL(5,2),
            notes TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        CREATE INDEX ix_analysis_segments_id ON analysis_segments(id);

        -- Create analytics_cache table  
        CREATE TABLE analytics_cache (
            id SERIAL PRIMARY KEY,
            activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
            metric_type VARCHAR(100) NOT NULL,
            parameters JSONB,
            computed_data JSONB,
            cache_version INTEGER DEFAULT 1,
            computed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            expires_at TIMESTAMP WITH TIME ZONE
        );

        CREATE INDEX ix_analytics_cache_id ON analytics_cache(id);
        CREATE INDEX idx_analytics_cache_lookup ON analytics_cache(activity_id, metric_type, parameters);

        -- Mark migration as applied
        INSERT INTO alembic_version (version_num) VALUES ('001');
        
        RAISE NOTICE 'Migration 001 applied successfully';
    ELSE
        RAISE NOTICE 'Migration 001 already applied, skipping';
    END IF;
END $$;

EOF

echo "Migration completed!"