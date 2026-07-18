import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# App settings
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Gemini API settings
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Feature Engineering / Statistical defaults
ROLLING_WINDOW = int(os.getenv("ROLLING_WINDOW", 10))

# Correlation Settings
CORRELATION_THRESHOLD = float(os.getenv("CORRELATION_THRESHOLD", 0.6))
TIME_WINDOW_SECONDS = int(os.getenv("TIME_WINDOW_SECONDS", 300))  # 5 minutes

# Correlation Weights (must sum to 1.0 or normalize)
WEIGHT_ASSET_MATCH = 0.4
WEIGHT_TIME_OVERLAP = 0.3
WEIGHT_SEVERITY_MATCH = 0.2
WEIGHT_CROSS_DOMAIN_BONUS = 0.1

# Vision Settings
# Polygon coordinates for restricted zones: Dict of camera_id -> list of (x, y) coordinates representing ROI
# We normalize coordinates or use scale. For demo, we define ROIs as normalized float coordinates [(x1,y1), (x2,y2), ...]
RESTRICTED_ZONES = {
    "CAM-01": [(0.1, 0.5), (0.4, 0.5), (0.4, 0.9), (0.1, 0.9)],  # Near CNC-04
    "CAM-02": [(0.5, 0.4), (0.8, 0.4), (0.8, 0.8), (0.5, 0.8)]   # Near Milling A
}
