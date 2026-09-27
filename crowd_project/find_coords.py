import cv2

cap = cv2.VideoCapture("corridor_video.mp4")
ret, frame = cap.read()

# draw grid lines every 100px to help you read coordinates
h, w = frame.shape[:2]
for x in range(0, w, 100):
    cv2.line(frame, (x, 0), (x, h), (0, 255, 0), 1)
    cv2.putText(frame, str(x), (x+2, 20), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,255,0), 1)
for y in range(0, h, 100):
    cv2.line(frame, (0, y), (w, y), (0, 255, 0), 1)
    cv2.putText(frame, str(y), (2, y+15), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0,255,0), 1)

cv2.imwrite("grid_frame.png", frame)
print("Saved grid_frame.png - open it and read off the gate corner coordinates")