import cv2
from ultralytics import YOLO

def test_model():
    # Load the .pt model from the models subfolder
    model_path = "./models/yolov8n.pt"
    print(f"Loading model from {model_path}...")
    model = YOLO(model_path)

    # Open webcam feed (0 is default webcam)
    cap = cv2.VideoCapture(0)
    
    if not cap.isOpened():
        print("Error: Could not open camera.")
        return

    print("Running model test. Press 'q' to quit.")

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Run inference for class 0 (person)
        results = model(frame, classes=[0], verbose=False)
        person_count = len(results[0].boxes)

        # Plot bounding boxes on the frame
        annotated_frame = results[0].plot()

        # Display the count on screen
        cv2.putText(annotated_frame, f"Count: {person_count}", (30, 50), 
                    cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)

        cv2.imshow("EventFlow-AI Model Test", annotated_frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    test_model()