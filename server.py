"""CleanTown waste-photo recognition API using Ultralytics YOLO + Pillow.

The pretrained COCO model detects common objects, not every waste type. For
items outside its label set (e.g. batteries, cardboard, used tissue), return
uncertain and let the resident choose manually. This is a hackathon prototype;
add authentication, rate limiting, and deployment controls before public use.
"""
import io
import mimetypes
import os
import threading
from pathlib import Path

from flask import Flask, abort, jsonify, request, send_from_directory
from PIL import Image, UnidentifiedImageError
from ultralytics import YOLO

ROOT = Path(__file__).resolve().parent
MODEL_NAME = os.environ.get("CLEANTOWN_YOLO_MODEL", "yolo11n.pt")
MAX_IMAGE_BYTES = 12 * 1024 * 1024
ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"}
# Only the app's own front-end files are served. Serving ROOT wholesale would also
# expose server.py, the model weights and the .git folder to anyone on the network.
STATIC_FILES = {"index.html", "app.css", "app.js", "sw.js", "manifest.webmanifest", "ai-config.js", "supabase-config.js"}
ICON_FILES = {"icon.svg", "icon-192.png", "icon-512.png", "icon-maskable-512.png"}

mimetypes.add_type("application/manifest+json", ".webmanifest")
mimetypes.add_type("text/javascript", ".js")

app = Flask(__name__, static_folder=None)
app.config["MAX_CONTENT_LENGTH"] = MAX_IMAGE_BYTES + 1024 * 1024
model = None
model_lock = threading.Lock()

# COCO class names supported by the generic pretrained YOLO detector.
CLASS_CATEGORY = {
    "bottle": "plastic-metal", "cup": "plastic-metal", "wine glass": "glass",
    "banana": "food", "apple": "food", "sandwich": "food", "orange": "food",
    "broccoli": "food", "carrot": "food", "hot dog": "food", "pizza": "food",
    "donut": "food", "cake": "food", "cell phone": "ewaste", "laptop": "ewaste",
    "tv": "ewaste", "remote": "ewaste", "keyboard": "ewaste", "mouse": "ewaste",
    "microwave": "ewaste", "oven": "ewaste", "toaster": "ewaste", "refrigerator": "ewaste",
    "book": "paper", "scissors": "general", "vase": "glass", "suitcase": "bulky",
    "chair": "bulky", "couch": "bulky", "bed": "bulky", "dining table": "bulky",
}
ADVICE = {
    "paper": "Keep paper clean and dry, then use a paper/cardboard recycling stream that accepts it.",
    "plastic-metal": "Empty and rinse packaging where practical. Check the local recycler's accepted plastics and metals.",
    "glass": "Handle carefully, keep broken glass contained, and use a glass collection point that accepts the item.",
    "food": "Separate food scraps from packaging. Compost suitable scraps or use an available organic-waste service.",
    "battery": "Battery type cannot be reliably identified by this model. Keep batteries separate and take them to a suitable collection point; do not put damaged batteries in ordinary rubbish.",
    "ewaste": "Keep electronics separate from household rubbish and use an authorised e-waste collection point. Confirm the facility accepts the item.",
    "general": "If it is not accepted for recycling, place it in the designated general-waste bin according to local rules.",
    "bulky": "Do not leave bulky items beside ordinary bins. Check local council or provider bulky-waste collection arrangements.",
    "uncertain": "YOLO could not confidently match this item to a supported object label. Choose the correct item manually and check local collection rules.",
}


def get_model():
    global model
    with model_lock:
        if model is None:
            model = YOLO(MODEL_NAME)  # downloads the small pretrained weights on first run
    return model


@app.get("/")
def index():
    return send_from_directory(ROOT, "index.html")


@app.get("/<path:filename>")
def static_files(filename):
    if filename in STATIC_FILES:
        response = send_from_directory(ROOT, filename)
        if filename == "sw.js":
            response.headers["Cache-Control"] = "no-cache"
        return response
    folder, _, name = filename.partition("/")
    if folder == "icons" and name in ICON_FILES:
        return send_from_directory(ROOT / "icons", name)
    abort(404)


@app.get("/api/health")
def health():
    try:
        detector = get_model()
        return jsonify({"ok": True, "provider": "Ultralytics YOLO", "model": MODEL_NAME,
                        "model_loaded": detector is not None,
                        "note": "Generic COCO detector; some waste types are not in its label set."})
    except Exception as exc:
        app.logger.exception("Could not load YOLO model")
        return jsonify({"ok": False, "provider": "Ultralytics YOLO", "model": MODEL_NAME,
                        "error": str(exc)}), 503


@app.errorhandler(413)
def too_large(_error):
    return jsonify({"error": "Image must be 12 MB or smaller."}), 413


@app.post("/api/classify")
def classify():
    upload = request.files.get("image")
    if not upload or not upload.filename:
        return jsonify({"error": "Upload a photo in the 'image' field."}), 400
    if upload.mimetype not in ALLOWED_MIME:
        return jsonify({"error": "Unsupported image type. Use JPEG, PNG, WebP, GIF or BMP."}), 415
    image_bytes = upload.read(MAX_IMAGE_BYTES + 1)
    if not image_bytes:
        return jsonify({"error": "The uploaded image is empty."}), 400
    if len(image_bytes) > MAX_IMAGE_BYTES:
        return jsonify({"error": "Image must be 12 MB or smaller."}), 413
    try:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    except (UnidentifiedImageError, OSError):
        return jsonify({"error": "The uploaded file is not a readable image."}), 400
    try:
        detector = get_model()
        result = detector.predict(source=image, imgsz=640, conf=0.20, verbose=False)[0]
        detections = []
        for box in result.boxes:
            class_name = result.names.get(int(box.cls[0]), "unknown")
            confidence = float(box.conf[0])
            detections.append({"name": class_name, "confidence": confidence})
        detections.sort(key=lambda d: d["confidence"], reverse=True)
        # Pick the highest-confidence detected object that maps to a waste guide.
        chosen = next((d for d in detections if d["name"] in CLASS_CATEGORY), None)
        if chosen and chosen["confidence"] >= 0.25:
            category = CLASS_CATEGORY[chosen["name"]]
            item = chosen["name"].replace("_", " ").title()
            confidence = chosen["confidence"]
        else:
            category = "uncertain"
            item = detections[0]["name"].title() if detections else "No supported waste object detected"
            confidence = detections[0]["confidence"] if detections else 0.0
        return jsonify({
            "category": category, "confidence": confidence, "item": item,
            "advice": ADVICE[category], "model": MODEL_NAME, "provider": "Ultralytics YOLO",
            "detections": detections[:5],
            "notice": "YOLO detects general objects, not waste condition or local recyclability. Verify the category and local acceptance rules.",
        })
    except Exception as exc:
        app.logger.exception("YOLO classification failed")
        return jsonify({"error": "Could not run YOLO recognition. Check the installed dependencies and model download.", "details": str(exc)}), 503


if __name__ == "__main__":
    host = os.environ.get("CLEANTOWN_HOST", "127.0.0.1")
    port = int(os.environ.get("CLEANTOWN_PORT", "8787"))
    print(f"CleanTown serving at http://{host}:{port} using Ultralytics YOLO model {MODEL_NAME}")
    app.run(host=host, port=port, debug=False, threaded=True)
