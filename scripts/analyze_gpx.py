#!/usr/bin/env python3
"""
Script do analizy pliku GPX - pokazuje strukturę i podstawowe statystyki
"""

import gpxpy
import sys
from datetime import datetime
from collections import Counter

def analyze_gpx(file_path):
    with open(file_path, 'r') as gpx_file:
        gpx = gpxpy.parse(gpx_file)
    
    print(f"=== Analiza GPX: {file_path} ===\n")
    
    # Podstawowe info
    print(f"Nazwa: {gpx.name or 'Brak'}")
    print(f"Opis: {gpx.description or 'Brak'}")
    print(f"Autor: {gpx.author_name or 'Brak'}")
    print(f"Tracks: {len(gpx.tracks)}")
    print(f"Routes: {len(gpx.routes)}")
    print(f"Waypoints: {len(gpx.waypoints)}")
    
    # Analiza tracków
    for i, track in enumerate(gpx.tracks):
        print(f"\n--- Track {i+1}: {track.name or 'Unnamed'} ---")
        print(f"Segmenty: {len(track.segments)}")
        
        total_points = sum(len(seg.points) for seg in track.segments)
        print(f"Punkty łącznie: {total_points}")
        
        if total_points > 0:
            # Przykładowy punkt - sprawdzamy jakie mamy dane
            first_point = track.segments[0].points[0]
            print(f"\nPrzykładowy punkt:")
            print(f"  Lat: {first_point.latitude}")
            print(f"  Lon: {first_point.longitude}")
            print(f"  Elevation: {first_point.elevation}")
            print(f"  Time: {first_point.time}")
            
            # Sprawdzamy extensions (dodatkowe dane)
            if hasattr(first_point, 'extensions') and first_point.extensions:
                print(f"  Extensions: {len(first_point.extensions)} elementów")
                for ext in first_point.extensions:
                    print(f"    {ext.tag}: {ext.text}")
            
            # Statystyki
            moving_data = track.get_moving_data()
            uphill_downhill = track.get_uphill_downhill()
            
            if moving_data:
                print(f"\nStatystyki ruchu:")
                print(f"  Dystans: {moving_data.moving_distance/1000:.2f} km")
                print(f"  Czas ruchu: {moving_data.moving_time}")
                print(f"  Czas zatrzymań: {moving_data.stopped_time}")
                print(f"  Max prędkość: {moving_data.max_speed:.2f} m/s")
            
            if uphill_downhill:
                print(f"  Podbieg: {uphill_downhill.uphill:.1f}m")
                print(f"  Spadek: {uphill_downhill.downhill:.1f}m")
        
        # Sprawdzamy jakie mamy dane w punktach
        data_types = Counter()
        for segment in track.segments:
            for point in segment.points[:100]:  # sprawdzamy pierwsze 100 punktów
                if point.elevation is not None:
                    data_types['elevation'] += 1
                if point.time is not None:
                    data_types['time'] += 1
                if hasattr(point, 'extensions') and point.extensions:
                    for ext in point.extensions:
                        data_types[f'ext_{ext.tag.split("}")[-1]}'] += 1
        
        print(f"\nTypy danych w punktach:")
        for data_type, count in data_types.items():
            print(f"  {data_type}: {count} punktów")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python analyze_gpx.py <gpx_file>")
        sys.exit(1)
    
    analyze_gpx(sys.argv[1])