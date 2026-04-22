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

# Configuración
VIDEO_SOURCE = os.getenv("VIDEO_SOURCE", "0")
# Si es un número (cámara local), convertir a int, si no (URL), dejar como string
if isinstance(VIDEO_SOURCE, str) and VIDEO_SOURCE.isdigit():
    VIDEO_SOURCE = int(VIDEO_SOURCE)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
GATE_ID = os.getenv("GATE_ID", "ENTRADA_PRINCIPAL")
GATE_TYPE = os.getenv("GATE_TYPE", "entrada") # 'entrada' o 'salida'
COOLDOWN_SECONDS = 15 

# Inicializar EasyOCR
print(f"[*] Iniciando Servicio ALPR para: {GATE_ID} ({GATE_TYPE.upper()})")
print("[*] Cargando motor OCR (EasyOCR)...")
reader = easyocr.Reader(['es', 'en'], gpu=False)

# Variables globales
frame_to_process = None
last_detected_plate = ""
last_detection_time = 0
plate_buffer = [] # Buffer para consenso de 3 lecturas

def normalize_plate(plate_text):
    clean = re.sub(r'[^A-Z0-9]', '', plate_text.upper())
    if len(clean) == 6:
        clean = clean[:3].replace('0', 'O').replace('1', 'I') + clean[3:].replace('O', '0').replace('I', '1')
    elif len(clean) == 7:
        letters1 = clean[:2].replace('0', 'O').replace('1', 'I')
        numbers = clean[2:5].replace('O', '0').replace('I', '1')
        letters2 = clean[5:].replace('0', 'O').replace('1', 'I')
        clean = letters1 + numbers + letters2

    if re.match(r'^[A-Z]{3}\d{3}$', clean) or re.match(r'^[A-Z]{2}\d{3}[A-Z]{2}$', clean):
        return clean
    return None

def send_to_backend_async(plate, frame):
    def worker():
        try:
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
            img_b64 = base64.b64encode(buffer).decode('utf-8')
            payload = {
                "plate": plate, 
                "gate_id": GATE_ID, 
                "image_base64": img_b64
            }

            # Elegir endpoint según el tipo de puerta
            endpoint = "/access/validate-plate" if GATE_TYPE == "entrada" else "/access/exit-plate"

            response = requests.post(f"{BACKEND_URL}{endpoint}", json=payload, timeout=5)
            result = response.json()
            print(f" [OK] {plate} enviado a {GATE_TYPE}. Respuesta: {result.get('message')}")
        except Exception as e:
            print(f" [ERROR] No se pudo enviar al backend: {e}")
    threading.Thread(target=worker, daemon=True).start()

def ocr_worker():
    global frame_to_process, last_detected_plate, last_detection_time, plate_buffer
    print(f"[*] Hilo OCR activo ({GATE_TYPE.upper()}) - Procesando frames en tiempo real.")
    
    while True:
        if frame_to_process is not None:
            # Tomamos el frame y lo limpiamos inmediatamente para que el siguiente 
            # que procesemos sea el ÚLTIMO que capturó la cámara (sin delay)
            img_orig = frame_to_process
            frame_to_process = None 
            
            # Procesamiento mejorado para nitidez
            h, w = img_orig.shape[:2]
            img_small = cv2.resize(img_orig, (640, int(h * (640/w))))
            gray = cv2.cvtColor(img_small, cv2.COLOR_BGR2GRAY)
            
            # 1. Contraste Adaptativo (CLAHE) para igualar iluminación
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
            gray = clahe.apply(gray)
            
            # 2. Filtro de Nitidez (Sharpening) para resaltar bordes de letras
            kernel = np.array([[-1,-1,-1], [-1,9,-1], [-1,-1,-1]])
            gray = cv2.filter2D(gray, -1, kernel)
            
            # 3. Umbralización para dejar la imagen en Blanco y Negro puro
            _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Lectura optimizada
            res = reader.readtext(thresh, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', detail=0)
            
            now = time.time()
            for text in res:
                clean = text.replace(" ", "").upper()
                plate = normalize_plate(clean)
                
                if plate:
                    plate_buffer.append(plate)
                    if len(plate_buffer) > 5: plate_buffer.pop(0) # Mantener ventana de 5 lecturas
                    
                    # Consenso: ¿aparece la misma patente al menos 3 veces?
                    if plate_buffer.count(plate) >= 3:
                        if plate != last_detected_plate or (now - last_detection_time > COOLDOWN_SECONDS):
                            print(f"\n[!] >>> PATENTE VALIDADA POR CONSENSO: {plate} <<<")
                            send_to_backend_async(plate, img_orig)
                            last_detected_plate = plate
                            last_detection_time = now
                            plate_buffer = [] # Resetear tras validación
        
        time.sleep(0.01)

def main():
    global frame_to_process
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    
    threading.Thread(target=ocr_worker, daemon=True).start()
    print("[*] Buscando patentes... (q para salir)")

    while True:
        ret, frame = cap.read()
        if not ret: break
        
        # Enviar frame al worker
        frame_to_process = frame.copy()

        cv2.imshow("ParkingTech - LIVE", frame)
        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
