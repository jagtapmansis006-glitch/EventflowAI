import cv2
from ultralytics import YOLO

def run_vision_pipeline():
    # Load model from the models subfolder
    model_path = "./models/yolov8n.pt"
    print(f"Loading YOLO model from {model_path}...")
    model = YOLO(model_path)

    # Initialize video capture (0 for webcam, or replace with video stream path)
    cap = cv2.VideoCapture(0)

    if not cap.isOpened():
        print("Error: Could not open video source.")
        return

    print("EventFlow-AI Vision Pipeline Active. Press 'q' to stop.")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Run inference targeting class 0 ('person')
        results = model(frame, classes=[0], verbose=False)
        
        # Extract live headcount for zone telemetry
        headcount = len(results[0].boxes)

        # Draw bounding boxes on frame
        annotated_frame = results[0].plot()

        # Overlay real-time headcount metric
        cv2.putText(
            annotated_frame, 
            f"Zone Headcount: {headcount}", 
            (30, 50), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            1, 
            (0, 255, 0), 
            2
        )

        cv2.imshow("EventFlow-AI - Edge Computer Vision", annotated_frame)

        # Press 'q' to break the loop
        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_vision_pipeline()