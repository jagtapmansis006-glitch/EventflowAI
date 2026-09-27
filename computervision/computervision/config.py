VIDEO_SOURCE = r"./cameras/camera_2/feed.mp4"
# Webcam
# VIDEO_SOURCE = 0

# Video file
# VIDEO_SOURCE = "crowd.mp4"

# CCTV

# VIDEO_SOURCE = "rtsp://username:password@ip:554/stream"

# Vertical counting line position, as a fraction of frame width (0.0 = left, 1.0 = right)
LINE_X_RATIO = 0.5

# Detection confidence threshold
CONFIDENCE_THRESHOLD = 0.35

# Identifiers — must match real records already in the backend's database
EVENT_ID = "event_apex_summit_2026"
ZONE_ID = "zone_north_plaza"
CAMERA_ID = "cam_n_plaza_01"

# Zone capacity, used to convert raw headcount into occupancyPercent (0-100).
# Matches zone_north_plaza's seeded capacity in backend/server/db.ts.
ZONE_CAPACITY = 12000

# Backend connection
BACKEND_URL = "http://localhost:3000/api/v1/internal/telemetry"
INTERNAL_CV_API_KEY = "eventflow_cv_secret_key"  # must match backend/.env

# Send telemetry to the backend every N frames
SEND_EVERY_N_FRAMES = 30