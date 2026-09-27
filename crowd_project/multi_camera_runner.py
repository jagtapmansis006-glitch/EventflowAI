import os
import time
import requests
import cv2
import numpy as np
from ultralytics import YOLO

# Configuration
API_URL = os.environ.get("EVENTFLOW_API_URL", "http://localhost:3001/api/v1/internal/telemetry")
API_KEY = os.environ.get("EVENTFLOW_API_KEY", "eventflow_cv_secret_key")
EVENT_ID = os.environ.get("EVENTFLOW_EVENT_ID", "event_apex_summit_2026")

# Camera-to-Zone mappings (matches db.json)
CAMERA_CONFIGS = [
    {
        "camera_id": "cam_n_plaza_01",
        "zone_id": "zone_north_plaza",
        "video_path": "cameras/camera_1/feed.mp4"
    },
    {
        "camera_id": "cam_east_conc_03",
        "zone_id": "zone_east_concourse",
        "video_path": "cameras/camera_2/feed.mp4"
    },
    {
        "camera_id": "cam_bowl_pan_04",
        "zone_id": "zone_main_bowl",
        "video_path": "cameras/camera_3/feed.mp4"
    }
]

model = YOLO("yolov8n.pt")  # Nano model for fast multi-camera execution

def process_camera_feed(config):
    cam_id = config["camera_id"]
    zone_id = config["zone_id"]
    video_path = config["video_path"]

    if not os.path.exists(video_path):
        print(f"[WARNING] Video missing for {cam_id} at {video_path}. Skipping...")
        return

    cap = cv2.VideoCapture(video_path)
    track_history = {}
    speeds = []
    
    # Process up to 30 frames for fast telemetry update loop
    frame_count = 0
    total_detected = 0

    while cap.isOpened() and frame_count < 30:
        ret, frame = cap.read()
        if not ret:
            # Loop video back to frame 0 if ended
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = cap.read()
            if not ret:
                break

        results = model.track(frame, classes=[0], persist=True, verbose=False)
        now = time.time()

        if results[0].boxes.id is not None:
            boxes = results[0].boxes.xyxy.tolist()
            ids = results[0].boxes.id.int().tolist()
            total_detected = len(ids)

            for box, tid in zip(boxes, ids):
                x1, y1, x2, y2 = box
                cx, cy = (x1 + x2) / 2, (y1 + y2) / 2
                track_history.setdefault(tid, []).append((cx, cy, now))
                track_history[tid] = track_history[tid][-10:]

                if len(track_history[tid]) >= 2:
                    x_old, y_old, t_old = track_history[tid][0]
                    x_new, y_new, t_new = track_history[tid][-1]
                    dt = t_new - t_old
                    if dt > 0:
                        dist_px = np.linalg.norm([x_new - x_old, y_new - y_old])
                        speed_mps = (dist_px / 50.0) / dt  # ~50px = 1m
                        if speed_mps > 0.1:
                            speeds.append(speed_mps)

        frame_count += 1

    cap.release()

    # Calculate metrics
    avg_speed = round(sum(speeds) / len(speeds), 2) if speeds else 0.8
    inflow = max(1, int(total_detected * 0.4))
    outflow = max(0, int(total_detected * 0.2))
    net_flow = inflow - outflow  # STRICT RULE: Must equal inflow - outflow
    
    # Calculate occupancy and density
    capacity = 50  # Default zone threshold reference
    occupancy_pct = min(100, int((total_detected / capacity) * 100))
    
    if occupancy_pct > 85:
        density = "CRITICAL"
    elif occupancy_pct > 65:
        density = "BUSY"
    elif occupancy_pct > 35:
        density = "MODERATE"
    else:
        density = "LOW"

    # Construct exact backend body
    payload = {
        "eventId": EVENT_ID,
        "cameraId": cam_id,
        "zoneId": zone_id,
        "peopleCount": total_detected,
        "inflow": inflow,
        "outflow": outflow,
        "netFlow": net_flow,
        "occupancyPercent": occupancy_pct,
        "densityLevel": density,
        "queueLength": int(total_detected * 0.5),
        "averageDwellTime": 180,
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%S.000Z")
    }

    headers = {
        "x-api-key": API_KEY,
        "Content-Type": "application/json"
    }

    try:
        response = requests.post(API_URL, json=payload, headers=headers, timeout=3)
        if response.status_code == 201:
            print(f" success [{cam_id}] -> Count: {total_detected} | Speed: {avg_speed} m/s | Density: {density}")
        else:
            print(f" error [{cam_id}] -> {response.status_code}: {response.text}")
    except Exception as e:
        print(f" failed [{cam_id}] -> Connection error: {e}")

if __name__ == "__main__":
    print("🚀 Starting Multi-Camera AI Telemetry Loop...")
    while True:
        for config in CAMERA_CONFIGS:
            process_camera_feed(config)
        time.sleep(2)  # Pause 2 seconds between full camera cycles