-- Sporter Database Schema
-- PostgreSQL + PostGIS

-- Enable PostGIS extension
CREATE EXTENSION IF NOT EXISTS postgis;

-- Tabela aktywności
CREATE TABLE activities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    activity_type VARCHAR(50), -- 'running', 'cycling', 'walking', 'hiking'
    start_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER, -- całkowity czas aktywności
    distance_km DECIMAL(8,3),
    elevation_gain_m DECIMAL(8,2),
    elevation_loss_m DECIMAL(8,2),
    max_speed_ms DECIMAL(6,3),
    avg_speed_ms DECIMAL(6,3),
    -- HR analytics (z wykluczeniem nieprawidłowych odczytów)
    avg_heart_rate INTEGER, -- po wykluczeniu outlierów
    max_heart_rate INTEGER,
    min_heart_rate INTEGER,
    -- Metadane
    gpx_file_path VARCHAR(500),
    total_trackpoints INTEGER, -- wszystkie punkty
    valid_hr_trackpoints INTEGER, -- punkty z prawidłowym HR
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabela punktów GPS z flagami wykluczeń
CREATE TABLE trackpoints (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    point_order INTEGER NOT NULL, -- kolejność w segmencie (0-based)
    coordinates POINT NOT NULL, -- PostGIS: POINT(longitude, latitude)
    elevation DECIMAL(7,2),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Sensor data
    heart_rate INTEGER,
    cadence INTEGER, -- kroki/min dla biegania, obr/min dla kolarstwa
    temperature DECIMAL(4,1), -- celsius
    speed_ms DECIMAL(6,3), -- można wyliczyć lub z GPX
    
    -- Analysis flags - do wykluczania z analiz
    exclude_from_hr_analysis BOOLEAN DEFAULT FALSE, -- fałszywe odczyty HR
    exclude_from_gps_analysis BOOLEAN DEFAULT FALSE, -- błędne pozycje GPS
    exclude_from_pace_analysis BOOLEAN DEFAULT FALSE, -- outlier prędkości
    exclusion_reason TEXT, -- dlaczego wykluczony: 'hr_startup', 'gps_drift', 'pause', etc
    
    -- Automatyczne znaczniki
    is_stationary BOOLEAN DEFAULT FALSE, -- punkt bez ruchu (pauza)
    distance_from_previous_m DECIMAL(8,3), -- dystans od poprzedniego punktu
    time_gap_seconds INTEGER, -- przerwa czasowa od poprzedniego punktu
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexy dla wydajności
CREATE INDEX idx_trackpoints_activity_order ON trackpoints(activity_id, point_order);
CREATE INDEX idx_trackpoints_coordinates ON trackpoints USING GIST(coordinates);
CREATE INDEX idx_trackpoints_recorded_at ON trackpoints(recorded_at);
CREATE INDEX idx_trackpoints_hr_analysis ON trackpoints(activity_id, exclude_from_hr_analysis) 
    WHERE exclude_from_hr_analysis = FALSE;

-- Tabela segmentów analizy (opcjonalna - dla zaawansowanych analiz)
CREATE TABLE analysis_segments (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    segment_type VARCHAR(50), -- 'warmup', 'main', 'cooldown', 'interval', 'rest'
    start_point_order INTEGER,
    end_point_order INTEGER,
    distance_km DECIMAL(8,3),
    duration_seconds INTEGER,
    avg_heart_rate INTEGER,
    avg_pace_min_per_km DECIMAL(5,2),
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabela cache analiz (dla kosztownych obliczeń)
CREATE TABLE analytics_cache (
    id SERIAL PRIMARY KEY,
    activity_id INTEGER REFERENCES activities(id) ON DELETE CASCADE,
    metric_type VARCHAR(100), -- 'hr_zones', 'pace_analysis', 'elevation_profile', etc
    parameters JSONB, -- parametry analizy (np. strefy HR, filtry)
    computed_data JSONB, -- wyniki analizy
    cache_version INTEGER DEFAULT 1,
    computed_at TIMESTAMP DEFAULT NOW(),
    expires_at TIMESTAMP
);

CREATE INDEX idx_analytics_cache_lookup ON analytics_cache(activity_id, metric_type, parameters);

-- Views dla częstych zapytań

-- Punkty z prawidłowym HR (bez wykluczeń)
CREATE VIEW valid_hr_trackpoints AS
SELECT * FROM trackpoints 
WHERE heart_rate IS NOT NULL 
  AND exclude_from_hr_analysis = FALSE;

-- Punkty z prawidłowym GPS (bez wykluczeń)  
CREATE VIEW valid_gps_trackpoints AS
SELECT * FROM trackpoints
WHERE exclude_from_gps_analysis = FALSE;

-- Statystyki aktywności z prawidłowymi danymi
CREATE VIEW activity_stats AS
SELECT 
    a.id,
    a.name,
    a.activity_type,
    a.start_time,
    a.distance_km,
    -- HR stats tylko z prawidłowych odczytów
    AVG(t.heart_rate)::INTEGER as avg_hr_valid,
    MAX(t.heart_rate) as max_hr_valid,
    MIN(t.heart_rate) as min_hr_valid,
    COUNT(*) FILTER (WHERE t.heart_rate IS NOT NULL AND t.exclude_from_hr_analysis = FALSE) as valid_hr_points,
    -- Pace stats
    AVG(t.speed_ms) as avg_speed_ms,
    MAX(t.speed_ms) as max_speed_ms
FROM activities a
JOIN trackpoints t ON a.id = t.activity_id
WHERE t.exclude_from_gps_analysis = FALSE
GROUP BY a.id, a.name, a.activity_type, a.start_time, a.distance_km;

-- Funkcje pomocnicze

-- Funkcja do automatycznego oznaczania outlierów HR
CREATE OR REPLACE FUNCTION mark_hr_outliers(activity_id_param INTEGER)
RETURNS INTEGER AS $$
DECLARE
    outliers_marked INTEGER := 0;
BEGIN
    -- Oznacz punkty z HR < 60 lub > 200 w pierwszym kilometrze
    UPDATE trackpoints 
    SET 
        exclude_from_hr_analysis = TRUE,
        exclusion_reason = 'hr_startup_outlier'
    WHERE activity_id = activity_id_param
      AND point_order <= (SELECT COUNT(*) * 0.1 FROM trackpoints WHERE activity_id = activity_id_param) -- pierwsze 10%
      AND heart_rate IS NOT NULL
      AND (heart_rate < 60 OR heart_rate > 200)
      AND exclude_from_hr_analysis = FALSE;
    
    GET DIAGNOSTICS outliers_marked = ROW_COUNT;
    
    RETURN outliers_marked;
END;
$$ LANGUAGE plpgsql;

-- Przykład użycia:
-- SELECT mark_hr_outliers(1); -- oznacz outliers dla aktywności ID=1