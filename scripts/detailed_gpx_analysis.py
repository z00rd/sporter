#!/usr/bin/env python3
"""
Szczegółowa analiza pliku GPX - sprawdza extensions i wszystkie dostępne dane
"""

import gpxpy
import sys
import xml.etree.ElementTree as ET

def detailed_analyze_gpx(file_path):
    with open(file_path, 'r') as gpx_file:
        gpx = gpxpy.parse(gpx_file)
    
    print(f"=== Szczegółowa analiza GPX: {file_path} ===\n")
    
    track = gpx.tracks[0]
    segment = track.segments[0]
    
    # Sprawdzamy pierwsze 5 punktów szczegółowo
    print("=== Pierwsze 5 punktów ===")
    for i, point in enumerate(segment.points[:5]):
        print(f"\nPunkt {i+1}:")
        print(f"  Lat/Lon: {point.latitude}, {point.longitude}")
        print(f"  Elevation: {point.elevation}")
        print(f"  Time: {point.time}")
        
        if hasattr(point, 'extensions') and point.extensions:
            print(f"  Extensions:")
            for ext in point.extensions:
                print(f"    Tag: {ext.tag}")
                print(f"    Text: {ext.text}")
                print(f"    Attrib: {ext.attrib}")
                
                # Sprawdzamy dzieci elementu
                for child in ext:
                    print(f"      Child - Tag: {child.tag}, Text: {child.text}, Attrib: {child.attrib}")
                    
                    # Sprawdzamy wnuki
                    for grandchild in child:
                        print(f"        Grandchild - Tag: {grandchild.tag}, Text: {grandchild.text}")
    
    # Sprawdzamy też raw XML żeby zobaczyć pełną strukturę
    print(f"\n=== Raw XML przykładu (pierwsze 2000 znaków) ===")
    with open(file_path, 'r') as f:
        content = f.read()
        print(content[:2000])

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python detailed_gpx_analysis.py <gpx_file>")
        sys.exit(1)
    
    detailed_analyze_gpx(sys.argv[1])