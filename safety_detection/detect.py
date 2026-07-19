import cv2

from ultralytics import YOLO

from safety_engine import SafetyEngine


MODEL_PATH = "models/forgemind_ppe.pt"

VIDEO_PATH = "videos/input3.mp4"

OUTPUT_PATH = "outputs/output.mp4"


model = YOLO(MODEL_PATH)

engine = SafetyEngine()

cap = cv2.VideoCapture(VIDEO_PATH)

width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))

height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

fps = cap.get(cv2.CAP_PROP_FPS)

fourcc = cv2.VideoWriter_fourcc(*"mp4v")

writer = cv2.VideoWriter(
    OUTPUT_PATH,
    fourcc,
    fps,
    (width, height)
)


while True:

    ret, frame = cap.read()

    if not ret:
        break

    results = model(frame, verbose=False)

    detections = []

    for r in results:

        boxes = r.boxes

        for box in boxes:

            cls = int(box.cls[0])

            name = model.names[cls]

            x1, y1, x2, y2 = map(int, box.xyxy[0])

            detections.append({

                "class": name,

                "box": (x1, y1, x2, y2)

            })

    workers = engine.evaluate(detections)

    for worker in workers:

        x1, y1, x2, y2 = worker["box"]

        color = (0,255,0)

        if worker["status"] == "UNSAFE":
            color = (0,0,255)

        cv2.rectangle(frame,(x1,y1),(x2,y2),color,3)

        cv2.putText(
            frame,
            worker["status"],
            (x1,y1-10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.7,
            color,
            2
        )

    writer.write(frame)

    cv2.imshow("ForgeMind Safety AI", frame)

    if cv2.waitKey(1) == 27:
        break

cap.release()

writer.release()

cv2.destroyAllWindows()