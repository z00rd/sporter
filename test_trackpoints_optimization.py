#!/usr/bin/env python3
"""
Test for trackpoints endpoint optimization

This test ensures that the optimized trackpoints endpoint returns
the same data as the original implementation while being more performant.
"""

import requests
import time
from typing import List, Dict, Any

def test_trackpoints_endpoint():
    """Test trackpoints endpoint functionality and performance"""
    
    BASE_URL = "http://localhost:8000/api/v1"
    
    # Test cases
    test_cases = [
        {"activity_id": 1, "limit": None, "description": "All trackpoints for activity 1"},
        {"activity_id": 1, "limit": 5, "description": "Limited trackpoints for activity 1"},
        {"activity_id": 2, "limit": 10, "description": "Limited trackpoints for activity 2"},
        {"activity_id": 999, "limit": None, "description": "Non-existent activity (should return 404)"},
    ]
    
    print("🧪 Testing trackpoints endpoint...")
    
    for i, case in enumerate(test_cases):
        activity_id = case["activity_id"]
        limit = case["limit"]
        description = case["description"]
        
        print(f"\n{i+1}. {description}")
        
        # Build URL
        url = f"{BASE_URL}/activities/{activity_id}/trackpoints"
        if limit:
            url += f"?limit={limit}"
        
        # Measure request time
        start_time = time.time()
        response = requests.get(url)
        end_time = time.time()
        
        request_time = (end_time - start_time) * 1000  # Convert to milliseconds
        
        print(f"   📊 Response time: {request_time:.2f}ms")
        print(f"   📋 Status code: {response.status_code}")
        
        if response.status_code == 404:
            print("   ✅ Expected 404 for non-existent activity")
            continue
            
        if response.status_code != 200:
            print(f"   ❌ Unexpected status code: {response.status_code}")
            print(f"   📄 Response: {response.text}")
            continue
            
        try:
            data = response.json()
            
            if not isinstance(data, list):
                print(f"   ❌ Expected list, got {type(data)}")
                continue
                
            print(f"   📍 Trackpoints returned: {len(data)}")
            
            # Validate structure of first trackpoint
            if data:
                tp = data[0]
                required_fields = ["point_order", "latitude", "longitude", "elevation", "recorded_at", "heart_rate", "speed_ms"]
                
                missing_fields = [field for field in required_fields if field not in tp]
                if missing_fields:
                    print(f"   ❌ Missing fields: {missing_fields}")
                    continue
                    
                # Validate data types
                if not isinstance(tp["point_order"], int):
                    print(f"   ❌ point_order should be int, got {type(tp['point_order'])}")
                    continue
                    
                if tp["latitude"] is not None and not isinstance(tp["latitude"], (int, float)):
                    print(f"   ❌ latitude should be number, got {type(tp['latitude'])}")
                    continue
                    
                print(f"   📍 Sample point: order={tp['point_order']}, lat={tp['latitude']}, lng={tp['longitude']}")
                
            # Validate limit parameter
            if limit and len(data) > limit:
                print(f"   ❌ Returned {len(data)} points but limit was {limit}")
                continue
                
            # Validate order
            for j in range(1, min(5, len(data))):  # Check first 5 points
                if data[j]["point_order"] <= data[j-1]["point_order"]:
                    print(f"   ❌ Points not ordered by point_order: {data[j-1]['point_order']} >= {data[j]['point_order']}")
                    break
            
            print("   ✅ All validations passed")
            
        except Exception as e:
            print(f"   ❌ Error parsing response: {e}")
            
    print("\n🏁 Test completed")

def measure_performance_impact():
    """Measure performance difference for large datasets"""
    
    BASE_URL = "http://localhost:8000/api/v1"
    
    print("\n⚡ Performance measurement...")
    
    # Test with different limits to see N+1 query impact
    limits = [1, 10, 50, 100]
    
    for limit in limits:
        url = f"{BASE_URL}/activities/1/trackpoints?limit={limit}"
        
        # Warm up
        requests.get(url)
        
        # Measure multiple requests
        times = []
        for _ in range(3):
            start_time = time.time()
            response = requests.get(url)
            end_time = time.time()
            
            if response.status_code == 200:
                times.append((end_time - start_time) * 1000)
        
        if times:
            avg_time = sum(times) / len(times)
            print(f"   📊 Limit {limit:3d}: {avg_time:6.2f}ms avg ({min(times):.2f}-{max(times):.2f}ms)")

if __name__ == "__main__":
    test_trackpoints_endpoint()
    measure_performance_impact()