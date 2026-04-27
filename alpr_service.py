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

def fix_common_errors(text, expected_type):
    # expected_type: 'L' para letra, 'N' para numero
    mapping_to_letters = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B'}
    mapping_to_numbers = {'O': '0', 'I': '1', 'J': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6'}
    
    fixed = ""
    for char in text:
        if expected_type == 'L':
            fixed += mapping_to_letters.get(char, char)
        else:
            fixed += mapping_to_numbers.get(char, char)
    return fixed

def normalize_plate(plate_text):
    # 1. Limpieza total: solo dejamos letras y numeros
    clean = re.sub(r'[^A-Z0-9]', '', plate_text.upper())
    
    # Si la cadena es muy corta, no es una patente
    if len(clean) < 5: return None

    # --- INTENTO 1: BUSCAR FORMATO MERCOSUR (7 CARACTERES: LL NNN LL) ---
    # Buscamos cualquier secuencia de 7 caracteres dentro de la cadena que cumpla el patron difuso
    for i in range(len(clean) - 6):
        window = clean[i:i+7]
        # Formato: 2 letras, 3 numeros, 2 letras
        l1 = fix_common_errors(window[:2], 'L')
        n  = fix_common_errors(window[2:5], 'N')
        l2 = fix_common_errors(window[5:], 'L')
        
        # Verificamos si logramos reconstruir una patente valida de 7
        if re.match(r'^[A-Z]{2}\d{3}[A-Z]{2}$', l1 + n + l2):
            return l1 + n + l2

    # --- INTENTO 2: BUSCAR FORMATO VIEJO (6 CARACTERES: LLL NNN) ---
    for i in range(len(clean) - 5):
        window = clean[i:i+6]
        # Formato: 3 letras, 3 numeros
        l = fix_common_errors(window[:3], 'L')
        n = fix_common_errors(window[3:], 'N')
        
        if re.match(r'^[A-Z]{3}\d{3}$', l + n):
            return l + n

    # --- INTENTO 3: CASOS DESESPERADOS (5 O MAS CARACTERES QUE PARECEN PATENTE) ---
    # Si la cadena completa tiene entre 5 y 8 caracteres y no matcheo antes, 
    # intentamos forzar una lectura si tiene una estructura clara.
    if 5 <= len(clean) <= 8:
        # Si parece vieja pero le falta un numero o letra
        posible_l = fix_common_errors(clean[:3], 'L')
        posible_n = fix_common_errors(clean[3:], 'N')
        if len(posible_l) >= 2 and len(posible_n) >= 2:
             # Si logramos al menos 2 letras y 2 numeros, podriamos tener algo, 
             # pero para evitar falsos positivos pedimos al menos una longitud de 6 despues de fix
             final = posible_l[:3] + posible_n[:3]
             if len(final) == 6 and re.match(r'^[A-Z]{3}\d{3}$', final):
                 return final

    return None

def deskew_image(image):
    # Intentamos detectar la inclinacion del texto para enderezarlo
    coords = np.column_stack(np.where(image > 0))
    angle = cv2.minAreaRect(coords)[-1]
    
    # El angulo devuelto por minAreaRect puede ser engañoso segun la version de OpenCV
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
        
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    return rotated

def send_to_backend_async(plate, frame):
    def _send():
        try:
            # 1. Preparar imagen
            _, buffer = cv2.imencode(".jpg", frame)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            
            # 2. Determinar endpoint según el tipo de puerta
            endpoint = "/access/validate-plate" if GATE_TYPE == "entrada" else "/access/exit-plate"
            url = f"{BACKEND_URL}{endpoint}"
            
            # 3. Preparar payload según schemas.PlateValidation
            payload = {
                "plate": plate,
                "gate_id": GATE_ID,
                "image_base64": img_base64
            }
            
            # 4. Enviar petición POST
            response = requests.post(url, json=payload, timeout=10)
            if response.status_code == 200:
                result = response.json()
                print(f"\n[BACKEND] {result.get('message', 'OK')}")
            else:
                print(f"\n[ERROR] Backend respondió {response.status_code}: {response.text}")
                
        except Exception as e:
            print(f"\n[ERROR] Falla en comunicación con backend: {e}")

    # Ejecutar en hilo separado para no bloquear el OCR
    threading.Thread(target=_send, daemon=True).start()

def ocr_worker():
    global frame_to_process, last_detected_plate, last_detection_time, plate_buffer
    print(f"[*] Hilo OCR activo ({GATE_TYPE.upper()}) - Escaneando...")
    
    while True:
        if frame_to_process is not None:
            img_orig = frame_to_process
            frame_to_process = None 
            
            # 1. Pre-procesamiento base (Escala de grises y Filtro Bilateral)
            gray = cv2.cvtColor(img_orig, cv2.COLOR_BGR2GRAY)
            gray = cv2.bilateralFilter(gray, 11, 17, 17)
            
            # 2. Redimensionar para estandarizar el proceso
            h, w = gray.shape
            gray = cv2.resize(gray, (1000, int(h * (1000/w))))
            
            # 3. Mejora de contraste adaptativo (CLAHE)
            clahe = cv2.createCLAHE(clipLimit=4.0, tileGridSize=(10,10))
            gray = clahe.apply(gray)

            # --- INTENTO 1: Imagen Normal ---
            res = reader.readtext(gray, detail=0)
            
            # --- INTENTO 2: Enderezado y Umbralizado (Para angulos extraños) ---
            # Aplicamos un umbral para resaltar texto y luego intentamos enderezar
            _, thresh_basic = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            skewed_corrected = deskew_image(thresh_basic)
            res_skew = reader.readtext(skewed_corrected, detail=0)

            # --- INTENTO 3: Imagen Invertida (Para patentes negras) ---
            inverted = 255 - gray
            thresh_inv = cv2.adaptiveThreshold(inverted, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            res_inv = reader.readtext(thresh_inv, detail=0)
            
            all_detected = res + res_skew + res_inv
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
