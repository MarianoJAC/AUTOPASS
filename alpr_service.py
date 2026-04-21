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
if len(str(VIDEO_SOURCE)) and str(VIDEO_SOURCE).isdigit():
    VIDEO_SOURCE = int(VIDEO_SOURCE)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
COOLDOWN_SECONDS = 15 

# Inicializar EasyOCR
print("[*] Cargando motor OCR (EasyOCR)...")
reader = easyocr.Reader(['es', 'en'], gpu=False)

# Variables globales
frame_to_process = None
last_detected_plate = ""
last_detection_time = 0

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
            payload = {"plate": plate, "gate_id": "ENTRADA_PRINCIPAL", "image_base64": img_b64}
            requests.post(f"{BACKEND_URL}/access/validate-plate", json=payload, timeout=5)
            print(f" [OK] {plate} enviado.")
        except: pass
    threading.Thread(target=worker, daemon=True).start()

def ocr_worker():
    global frame_to_process, last_detected_plate, last_detection_time
    print("[*] Hilo OCR activo y optimizado para contraste.")
    
    while True:
        if frame_to_process is not None:
            img_orig = frame_to_process.copy()
            frame_to_process = None
            
            # Reducir para velocidad y precisión del OCR
            h, w = img_orig.shape[:2]
            img_small = cv2.resize(img_orig, (640, int(h * (640/w))))
            gray = cv2.cvtColor(img_small, cv2.COLOR_BGR2GRAY)
            
            # Aplicar umbral para resaltar letras blancas (formato viejo)
            # y también letras negras (formato nuevo) al invertir
            _, thresh = cv2.threshold(gray, 100, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # Intento 1: Normal
            res = reader.readtext(thresh, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
            # Intento 2: Invertido
            inv = cv2.bitwise_not(thresh)
            res_inv = reader.readtext(inv, allowlist='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789')
            res.extend(res_inv)
            
            now = time.time()
            for (bbox, text, prob) in res:
                clean = text.replace(" ", "").upper()
                if len(clean) >= 3:
                    print(f"[*] Detectado: '{clean}' ({prob:.2f})")
                
                plate = normalize_plate(clean)
                if plate and prob > 0.15:
                    if plate != last_detected_plate or (now - last_detection_time > COOLDOWN_SECONDS):
                        print(f"\n[!] >>> PATENTE ENCONTRADA: {plate} <<<")
                        send_to_backend_async(plate, img_orig)
                        last_detected_plate = plate
                        last_detection_time = now
        
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
