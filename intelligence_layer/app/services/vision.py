import logging
import cv2
import numpy as np
from typing import List, Dict, Tuple, Optional
from app.config import RESTRICTED_ZONES
from app.schemas.models import VisionEvent

logger = logging.getLogger("app.vision")

# Lazy-loaded YOLO model
YOLO_MODEL = None

def get_yolo_model():
    """Lazy loads YOLOv11 model to avoid loading overhead during startup."""
    global YOLO_MODEL
    if YOLO_MODEL is None:
        try:
            from ultralytics import YOLO
            # Load pretrained YOLO11 nano model (lightweight, runs fast on CPU)
            # Ultralytics will automatically download this model if it's not present
            logger.info("Initializing YOLOv11 model...")
            YOLO_MODEL = YOLO("yolo11n.pt")
            logger.info("YOLOv11 model loaded successfully.")
        except Exception as e:
            logger.error(f"Failed to load YOLOv11: {e}. Running in Mock/Simulated Vision mode.")
            YOLO_MODEL = "mock"
    return YOLO_MODEL

def is_point_in_polygon(point: Tuple[int, int], polygon: List[Tuple[int, int]]) -> bool:
    """Uses OpenCV to determine if a point is inside a polygon ROI."""
    poly_array = np.array(polygon, dtype=np.int32)
    # cv2.pointPolygonTest returns positive if inside, 0 if on edge, negative if outside
    result = cv2.pointPolygonTest(poly_array, (float(point[0]), float(point[1])), False)
    return result >= 0

def process_frame(
    frame: np.ndarray, 
    camera_id: str, 
    timestamp: str,
    line_id: str, 
    nearby_machine_id: str
) -> Optional[VisionEvent]:
    """
    Processes a single video frame:
    1. Detects people using YOLOv11.
    2. Converts normalized ROI coordinates from config to pixel coordinates.
    3. Checks if any detected person is standing inside the restricted polygon.
    4. Returns a VisionEvent if a violation is detected.
    """
    model = get_yolo_model()
    if model is None or model == "mock":
        # Fallback Mock Mode: simulate a violation if frame has a specific tag or randomly
        return None

    try:
        height, width, _ = frame.shape
        
        # Run YOLOv11 inference
        # classes=[0] filters detections to 'person' only
        results = model(frame, classes=[0], verbose=False)
        
        # Get polygon coordinates from config and scale to frame resolution
        normalized_poly = RESTRICTED_ZONES.get(camera_id)
        if not normalized_poly:
            logger.warning(f"No restricted zone polygon configured for camera {camera_id}")
            return None
            
        pixel_poly = [(int(x * width), int(y * height)) for x, y in normalized_poly]

        for result in results:
            boxes = result.boxes
            for box in boxes:
                # Bounding box coordinates: [x1, y1, x2, y2]
                xyxy = box.xyxy[0].tolist()
                x1, y1, x2, y2 = xyxy
                
                # We check the bottom-center of the bounding box (representing the person's feet/position on floor)
                bottom_center = (int((x1 + x2) / 2), int(y2))
                
                # Optional: draw bounding box and ROI for visual debugging/logging
                # (Can be saved to a debug image if needed)
                
                # Check if person is inside the restricted zone
                if is_point_in_polygon(bottom_center, pixel_poly):
                    confidence = float(box.conf[0])
                    logger.warning(f"Safety Alert! Person detected in restricted zone of {nearby_machine_id} on camera {camera_id}.")
                    
                    return VisionEvent(
                        timestamp=timestamp,
                        camera_id=camera_id,
                        line_id=line_id,
                        nearby_machine_id=nearby_machine_id,
                        event_type="restricted_zone_proximity",
                        confidence=confidence,
                        severity="high" if confidence > 0.8 else "medium"
                    )
                    
    except Exception as e:
        logger.error(f"Error in vision frame processing: {e}")
        
    return None

def draw_restricted_zone_overlay(frame: np.ndarray, camera_id: str) -> np.ndarray:
    """Helper to draw the restricted zone polygon onto a frame for display/debugging."""
    normalized_poly = RESTRICTED_ZONES.get(camera_id)
    if not normalized_poly:
        return frame
        
    height, width, _ = frame.shape
    pixel_poly = np.array([(int(x * width), int(y * height)) for x, y in normalized_poly], dtype=np.int32)
    
    # Draw translucent overlay
    overlay = frame.copy()
    cv2.fillPoly(overlay, [pixel_poly], (0, 0, 255)) # Red polygon
    alpha = 0.3 # Opacity
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)
    
    # Draw border
    cv2.polylines(frame, [pixel_poly], True, (0, 0, 255), 2)
    return frame
