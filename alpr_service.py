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
    # 1. Limpieza total
    clean = re.sub(r'[^A-Z0-9]', '', plate_text.upper())
    
    # 2. Prioridad 1: Formato Mercosur (7 caracteres: AB 123 CD)
    p_nuevo = re.search(r'([A-Z]{2}\d{3}[A-Z]{2})', clean)
    if p_nuevo: return p_nuevo.group(1)

    # 3. Prioridad 2: Formato Viejo (6 caracteres: ABC 123)
    p_viejo = re.search(r'([A-Z]{3})(\d{3})', clean)
    if p_viejo:
        return f"{p_viejo.group(1)}{p_viejo.group(2)}"
    
    # 4. Prioridad 3: Formato Corto (5 caracteres: AB 123)
    # Solo si el string total es corto para evitar falsos positivos con las de 6 o 7
    if len(clean) <= 6:
        p_corto = re.search(r'([A-Z]{2})(\d{3})', clean)
        if p_corto: return f"{p_corto.group(1)}{p_corto.group(2)}"

    return None

def ocr_worker():
    global frame_to_process, last_detected_plate, last_detection_time, plate_buffer
    print(f"[*] Hilo OCR activo ({GATE_TYPE.upper()}) - Escaneando...")
    
    while True:
        if frame_to_process is not None:
            img_orig = frame_to_process
            frame_to_process = None 
            
            # Pre-procesamiento base
            gray = cv2.cvtColor(img_orig, cv2.COLOR_BGR2GRAY)
            h, w = gray.shape
            gray = cv2.resize(gray, (800, int(h * (800/w))))
            
            # Aplicar contraste
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
            gray = clahe.apply(gray)

            # --- INTENTO 1: Imagen Normal (Para patentes nuevas) ---
            res = reader.readtext(gray, detail=0)
            
            # --- INTENTO 2: Imagen Invertida (Para patentes viejas blanco/negro) ---
            # Solo lo hacemos si el primero no devolvió algo que parezca patente
            inverted = 255 - gray
            res_inv = reader.readtext(inverted, detail=0)
            
            # Combinamos todos los resultados encontrados
            all_detected = res + res_inv
            
            # Intentamos normalizar CADA palabra y también la UNIÓN de todas
            # (por si leyó letras y números por separado)
            candidates = all_detected + ["".join(all_detected)]
            
            now = time.time()
            for text in candidates:
                plate = normalize_plate(text)
                
                if plate:
                    plate_buffer.append(plate)
                    if len(plate_buffer) > 5: plate_buffer.pop(0)
                    
                    if plate_buffer.count(plate) >= 2:
                        if plate != last_detected_plate or (now - last_detection_time > COOLDOWN_SECONDS):
                            print(f"\n[OK] >>> {plate} <<<")
                            send_to_backend_async(plate, img_orig)
                            last_detected_plate = plate
                            last_detection_time = now
                            plate_buffer = []
                            break # Encontrada, no seguir con este frame
        
        time.sleep(0.01)
        
        time.sleep(0.01)

def main():
    global frame_to_process
    
    # Intentar optimizar apertura de stream
    cap = cv2.VideoCapture(VIDEO_SOURCE, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) # Minimizar lag
    
    if not cap.isOpened():
        print(f"[CRITICAL] No se pudo abrir la fuente: {VIDEO_SOURCE}")
        return

    threading.Thread(target=ocr_worker, daemon=True).start()
    print("[*] Buscando patentes... (q para salir)")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[!] Perdiendo frames... reintentando")
            time.sleep(1)
            cap.open(VIDEO_SOURCE)
            continue
        
        frame_to_process = frame.copy()

        # Opcional: Redimensionar ventana para que no ocupe toda la pantalla
        cv2.imshow("ParkingTech - LIVE", cv2.resize(frame, (800, 450)))
        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
