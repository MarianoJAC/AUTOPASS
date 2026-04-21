import cv2
import easyocr
import requests
import time
import os
import re
import base64
from dotenv import load_dotenv

load_dotenv()

# Configuración
VIDEO_SOURCE = os.getenv("VIDEO_SOURCE", "0")
if len(VIDEO_SOURCE) == 1 and VIDEO_SOURCE.isdigit():
    VIDEO_SOURCE = int(VIDEO_SOURCE)

BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8000")
COOLDOWN_SECONDS = 5 

# Inicializar EasyOCR
print("[*] Cargando motor OCR (EasyOCR)...")
reader = easyocr.Reader(['es', 'en'], gpu=False)

def normalize_plate(plate_text):
    return re.sub(r'[^A-Z0-9]', '', plate_text.upper())

def send_to_backend(plate, frame):
    try:
        _, buffer = cv2.imencode('.jpg', frame)
        img_base64 = base64.b64encode(buffer).decode('utf-8')

        url = f"{BACKEND_URL}/access/validate-plate"
        payload = {
            "plate": plate, 
            "gate_id": "ENTRADA_PRINCIPAL",
            "image_base64": img_base64
        }
        response = requests.post(url, json=payload)
        if response.status_code == 200:
            result = response.json()
            print(f" [+] API Response: {result['message']}")
            return True
    except Exception as e:
        print(f" [!] Error conectando con el backend: {e}")
    return False

def main():
    cap = cv2.VideoCapture(VIDEO_SOURCE)
    last_detected_plate = ""
    last_detection_time = 0

    print(f"[*] ALPR Service iniciado. Fuente: {VIDEO_SOURCE}")
    print("[*] Presiona 'q' para salir.")

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        cv2.imshow("ParkingTech ALPR - Camara de Entrada", frame)

        current_time = time.time()
        if current_time - last_detection_time > 1:
            results = reader.readtext(frame)
            for (bbox, text, prob) in results:
                if prob > 0.4:
                    clean_plate = normalize_plate(text)
                    if len(clean_plate) >= 6:
                        if clean_plate != last_detected_plate or (current_time - last_detection_time > COOLDOWN_SECONDS):
                            print(f"\n[!] Patente detectada: {clean_plate} (Confianza: {prob:.2f})")
                            if send_to_backend(clean_plate, frame):
                                last_detected_plate = clean_plate
                                last_detection_time = current_time

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
