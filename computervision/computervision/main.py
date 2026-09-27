import os
import cv2
from ultralytics import YOLO
from config import (
    VIDEO_SOURCE,
    LINE_X_RATIO,
    CONFIDENCE_THRESHOLD,
    EVENT_ID,
    ZONE_ID,
    CAMERA_ID,
    ZONE_CAPACITY,
    BACKEND_URL,
    INTERNAL_CV_API_KEY,
    SEND_EVERY_N_FRAMES
)
from tracker import CrowdTracker
from telemetry import build_telemetry, send_telemetry


def run_vision_pipeline():
    model_path = "./models/yolov8s.pt"
    print(f"Loading YOLO model from {model_path}...")
    model = YOLO(model_path)

    if isinstance(VIDEO_SOURCE, str) and not os.path.exists(VIDEO_SOURCE):
        print(f"ERROR: Video file not found at resolved path: {os.path.abspath(VIDEO_SOURCE)}")
        return

    cap = cv2.VideoCapture(VIDEO_SOURCE)

    if not cap.isOpened():
        print("Error: Could not open video source.")
        return

    frame_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    frame_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    line_x = int(frame_width * LINE_X_RATIO)

    print(f"Video opened: {frame_width}x{frame_height}. Counting line at x={line_x}.")
    print("EventFlow-AI Vision Pipeline Active. Press 'q' to stop.")

    tracker = CrowdTracker()
    frame_count = 0

    # Track deltas since the last send, since the backend expects per-interval
    # inflow/outflow, not lifetime totals since the script started.
    last_sent_in = 0
    last_sent_out = 0

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            print("End of video stream (or read failed).")
            break

        frame_count += 1

        results = model.track(
            frame,
            persist=True,
            classes=[0],
            conf=CONFIDENCE_THRESHOLD,
            verbose=False
        )

        boxes = results[0].boxes
        headcount = len(boxes)

        if boxes is not None and boxes.id is not None:
            ids = boxes.id.cpu().numpy()
            xyxy = boxes.xyxy.cpu().numpy()
            for track_id, box in zip(ids, xyxy):
                x1, y1, x2, y2 = box
                center_x = (x1 + x2) / 2
                tracker.update_track(int(track_id), center_x, line_x)

        annotated_frame = results[0].plot()
        cv2.line(annotated_frame, (line_x, 0), (line_x, frame_height), (0, 0, 255), 2)
        cv2.putText(
            annotated_frame,
            f"Headcount: {headcount}  IN: {tracker.people_in}  OUT: {tracker.people_out}",
            (30, 50),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.9,
            (0, 255, 0),
            2
        )
        cv2.imshow("EventFlow-AI - Edge Computer Vision", annotated_frame)

        if frame_count % SEND_EVERY_N_FRAMES == 0:
            inflow_delta = tracker.people_in - last_sent_in
            outflow_delta = tracker.people_out - last_sent_out
            last_sent_in = tracker.people_in
            last_sent_out = tracker.people_out

            occupancy_percent = (headcount / ZONE_CAPACITY) * 100

            payload = build_telemetry(
                event_id=EVENT_ID,
                camera_id=CAMERA_ID,
                zone_id=ZONE_ID,
                people_count=headcount,
                inflow=inflow_delta,
                outflow=outflow_delta,
                occupancy_percent=occupancy_percent
            )

            print(f"[frame {frame_count}] sending: {payload}")
            send_telemetry(payload, BACKEND_URL, INTERNAL_CV_API_KEY)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    run_vision_pipeline()