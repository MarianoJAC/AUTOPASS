import cv2
import easyocr
import requests
import time
import os
import re
import base64
import threading
import numpy as np
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURACIÓN DEL SERVICIO ---
VIDEO_SOURCE = os.getenv("VIDEO_SOURCE", "0")
if isinstance(VIDEO_SOURCE, str) and VIDEO_SOURCE.isdigit():
    VIDEO_SOURCE = int(VIDEO_SOURCE)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
GATE_TYPE = os.getenv("GATE_TYPE", "entrada") # 'entrada' o 'salida'

# Identificación de la barrera (Gate ID)
DEFAULT_GATE_ID = "ENTRADA_PRINCIPAL" if GATE_TYPE == "entrada" else "SALIDA_PRINCIPAL"
GATE_ID = os.getenv("GATE_ID", DEFAULT_GATE_ID)
COOLDOWN_SECONDS = 15 # Tiempo de espera entre detecciones de la misma patente

# --- INICIALIZACIÓN DE MOTOR OCR ---
print(f"[*] Iniciando Servicio ALPR para: {GATE_ID} ({GATE_TYPE.upper()}) - AUTOPASS")
print("[*] Cargando motor de reconocimiento (EasyOCR)...")
reader = easyocr.Reader(['es', 'en'], gpu=False)

# --- VARIABLES DE ESTADO ---
frame_to_process = None
frame_to_stream = None
last_detected_plate = ""
last_detection_time = 0
plate_buffer = [] # Buffer para consenso de múltiples lecturas

def video_stream_worker():
    """Hilo encargado de transmitir el video comprimido al backend para monitoreo."""
    global frame_to_stream
    print(f"[*] Iniciando transmisión de video asíncrona...")
    while True:
        if frame_to_stream is not None:
            try:
                frame = frame_to_stream.copy()
                frame_to_stream = None
                
                # Redimensionamiento y compresión optimizada para baja latencia
                view_frame = cv2.resize(frame, (480, 360))
                _, buffer = cv2.imencode('.jpg', view_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 35])
                img_base64 = base64.b64encode(buffer).decode('utf-8')
                
                requests.post(f"{BACKEND_URL}/v1/system/update-frame/{GATE_ID}", 
                             json={"image": img_base64}, 
                             timeout=1.0)
            except Exception:
                pass
        time.sleep(0.05) # Límite de ~20 FPS para ahorrar ancho de banda

def normalize_plate(plate_text):
    """Limpia y normaliza el texto detectado para que coincida con formatos de patentes."""
    clean = re.sub(r'[^A-Z0-9]', '', plate_text.upper())
    if len(clean) < 6: return None

    # Mapeos de corrección inteligente para errores comunes de OCR (Ej: O por 0)
    to_l = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B'}
    to_n = {'O': '0', 'I': '1', 'J': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6'}

    def fix(txt, m): return "".join([m.get(c, c) for c in txt])

    # --- FORMATO MERCOSUR (AA 123 BB) ---
    for i in range(len(clean) - 6):
        w = clean[i:i+7]
        res = fix(w[:2], to_l) + fix(w[2:5], to_n) + fix(w[5:], to_l)
        if re.match(r'^[A-Z]{2}\d{3}[A-Z]{2}$', res): return res

    # --- FORMATO ANTERIOR (AAA 123) ---
    for i in range(len(clean) - 5):
        w = clean[i:i+6]
        res = fix(w[:3], to_l) + fix(w[3:], to_n)
        if re.match(r'^[A-Z]{3}\d{3}$', res): return res

    return None

def deskew_image(image):
    """Intenta enderezar la imagen si el texto detectado tiene inclinación."""
    coords = np.column_stack(np.where(image > 0))
    angle = cv2.minAreaRect(coords)[-1]
    
    if angle < -45: angle = -(90 + angle)
    else: angle = -angle
        
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    return cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

def send_to_backend_async(plate, frame):
    """Envía la patente detectada al backend en un hilo separado."""
    def _send():
        try:
            _, buffer = cv2.imencode(".jpg", frame)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            endpoint = "/v1/access/validate-plate" if GATE_TYPE == "entrada" else "/v1/access/exit-plate"
            payload = {"plate": plate, "gate_id": GATE_ID, "image_base64": img_base64}
            
            print(f"[*] Validando {plate} en el servidor...")
            resp = requests.post(f"{BACKEND_URL}{endpoint}", json=payload, timeout=10)
            
            if resp.status_code == 200:
                result = resp.json()
                status = result.get("status", "unknown")
                msg = result.get("message", "Sin respuesta")
                icon = "✅" if status == "allowed" else "❌" if status == "denied" else "ℹ️"
                print(f"{icon} [{status.upper()}] {msg}")
            else:
                print(f"⚠️ [ERROR] Backend respondió con status {resp.status_code}")
        except Exception as e:
            print(f"❌ [ERROR DE RED] {e}")

    threading.Thread(target=_send, daemon=True).start()

def heartbeat_worker():
    """Envía un pulso de vida (heartbeat) al backend periódicamente."""
    print(f"[SYSTEM] Monitor de salud activo para {GATE_ID}")
    while True:
        try:
            url = f"{BACKEND_URL}/v1/system/heartbeat?gate_id={GATE_ID}"
            requests.post(url, timeout=5)
        except Exception:
            pass
        time.sleep(15)

def ocr_worker():
    """Hilo principal de procesamiento de imágenes para reconocimiento de patentes."""
    global frame_to_process, last_detected_plate, last_detection_time, plate_buffer
    print(f"[*] Motor OCR activo ({GATE_TYPE.upper()}) - Escaneando...")
    
    while True:
        if frame_to_process is not None:
            img_orig = frame_to_process
            frame_to_process = None 
            
            # Pre-procesamiento de imagen
            gray = cv2.cvtColor(img_orig, cv2.COLOR_BGR2GRAY)
            gray = cv2.bilateralFilter(gray, 11, 17, 17)
            h, w = gray.shape
            gray = cv2.resize(gray, (1000, int(h * (1000/w))))
            clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(10,10))
            gray = clahe.apply(gray)

            # Intento 1: Imagen Original Optimizada
            res = reader.readtext(gray, detail=0)
            
            # Intento 2: Enderezado y Umbralizado (para ángulos extremos)
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            res_skew = reader.readtext(deskew_image(thresh), detail=0)

            # Intento 3: Imagen Invertida (formato antiguo)
            inverted = 255 - gray
            thresh_inv = cv2.adaptiveThreshold(inverted, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            res_inv = reader.readtext(thresh_inv, detail=0)
            
            candidates = list(set(res + res_skew + res_inv))
            if len(candidates) > 1: candidates.append("".join(candidates))
            
            now = time.time()
            for text in candidates:
                plate = normalize_plate(text)
                if plate:
                    plate_buffer.append(plate)
                    if len(plate_buffer) > 10: plate_buffer.pop(0)
                    
                    # Consenso: requiere al menos 2 detecciones iguales para validar
                    if plate_buffer.count(plate) >= 2:
                        if plate != last_detected_plate or (now - last_detection_time > COOLDOWN_SECONDS):
                            print(f"\n[DETECTADO] >>> {plate} <<<")
                            send_to_backend_async(plate, img_orig)
                            last_detected_plate = plate
                            last_detection_time = now
                            plate_buffer = [] 
                            break 
        time.sleep(0.01)

def main():
    global frame_to_process, frame_to_stream
    cap = cv2.VideoCapture(VIDEO_SOURCE, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) 
    
    if not cap.isOpened():
        print(f"[CRITICAL] Error al abrir fuente de video: {VIDEO_SOURCE}")
        return

    threading.Thread(target=ocr_worker, daemon=True).start()
    threading.Thread(target=heartbeat_worker, daemon=True).start()
    threading.Thread(target=video_stream_worker, daemon=True).start()
    print("[*] Buscando patentes... Presione 'q' para salir.")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[!] Señal de video perdida. Reintentando...")
            time.sleep(1)
            cap.open(VIDEO_SOURCE)
            continue
        
        frame_to_process = frame.copy()
        frame_to_stream = frame.copy()

        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
