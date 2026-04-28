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
GATE_TYPE = os.getenv("GATE_TYPE", "entrada") # 'entrada' o 'salida'
# Si no hay GATE_ID, asignamos según el tipo
DEFAULT_GATE_ID = "ENTRADA_PRINCIPAL" if GATE_TYPE == "entrada" else "SALIDA_PRINCIPAL"
GATE_ID = os.getenv("GATE_ID", DEFAULT_GATE_ID)
COOLDOWN_SECONDS = 15 

# Inicializar EasyOCR
print(f"[*] Iniciando Servicio ALPR para: {GATE_ID} ({GATE_TYPE.upper()}) - AUTOPASS")
print("[*] Cargando motor OCR (EasyOCR)...")
reader = easyocr.Reader(['es', 'en'], gpu=False)

# Variables globales
frame_to_process = None
frame_to_stream = None
last_detected_plate = ""
last_detection_time = 0
plate_buffer = [] # Buffer para consenso de 3 lecturas

def video_stream_worker():
    global frame_to_stream
    print(f"[*] Iniciando transmisión de video asíncrona...")
    while True:
        if frame_to_stream is not None:
            try:
                # Tomamos una copia y limpiamos para que el hilo principal siga
                frame = frame_to_stream.copy()
                frame_to_stream = None
                
                # Redimensionar y comprimir agresivamente para latencia cero
                view_frame = cv2.resize(frame, (480, 360))
                _, buffer = cv2.imencode('.jpg', view_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 35])
                img_base64 = base64.b64encode(buffer).decode('utf-8')
                
                resp = requests.post(f"{BACKEND_URL}/v1/system/update-frame/{GATE_ID}", 
                             json={"image": img_base64}, 
                             timeout=1.0) # Aumentado a 1.0s
                if resp.status_code != 200:
                    print(f"[!] Error enviando frame: {resp.status_code}")
            except Exception as e:
                # print(f"[-] Salto de frame de video: {e}")
                pass
        time.sleep(0.05) # Envía aprox 20 fps max

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
    # 1. Limpieza total: solo dejamos letras y números
    clean = re.sub(r'[^A-Z0-9]', '', plate_text.upper())
    
    if len(clean) < 6: return None

    # Mapeos de corrección inteligente
    to_l = {'0': 'O', '1': 'I', '2': 'Z', '5': 'S', '8': 'B'}
    to_n = {'O': '0', 'I': '1', 'J': '1', 'Z': '2', 'S': '5', 'B': '8', 'G': '6'}

    def fix(txt, m): return "".join([m.get(c, c) for c in txt])

    # --- FORMATO NUEVO (MERCOSUR): AA 123 BB (7 chars) ---
    for i in range(len(clean) - 6):
        w = clean[i:i+7]
        # Estructura: Letra-Letra | Número-Número-Número | Letra-Letra
        res = fix(w[:2], to_l) + fix(w[2:5], to_n) + fix(w[5:], to_l)
        if re.match(r'^[A-Z]{2}\d{3}[A-Z]{2}$', res): return res

    # --- FORMATO VIEJO: AAA 123 (6 chars) ---
    for i in range(len(clean) - 5):
        w = clean[i:i+6]
        # Estructura: Letra-Letra-Letra | Número-Número-Número
        res = fix(w[:3], to_l) + fix(w[3:], to_n)
        if re.match(r'^[A-Z]{3}\d{3}$', res): return res

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
            _, buffer = cv2.imencode(".jpg", frame)
            img_base64 = base64.b64encode(buffer).decode('utf-8')
            endpoint = "/v1/access/validate-plate" if GATE_TYPE == "entrada" else "/v1/access/exit-plate"
            payload = {"plate": plate, "gate_id": GATE_ID, "image_base64": img_base64}
            
            print(f"[*] Enviando {plate} a {endpoint}...")
            resp = requests.post(f"{BACKEND_URL}{endpoint}", json=payload, timeout=10)
            
            if resp.status_code == 200:
                result = resp.json()
                status = result.get("status", "unknown")
                msg = result.get("message", "Sin respuesta")
                
                if status == "allowed":
                    print(f"✅ [AUTORIZADO] {msg}")
                elif status == "denied":
                    print(f"❌ [DENEGADO] {msg}")
                else:
                    print(f"ℹ️ [INFO] {msg}")
            else:
                print(f"⚠️ [ERROR] Backend respondió con status {resp.status_code}")
                
        except Exception as e:
            print(f"❌ [ERROR DE RED] No se pudo conectar con el backend: {e}")

    threading.Thread(target=_send, daemon=True).start()

def heartbeat_worker():
    print(f"[SYSTEM] Iniciando monitor de salud para {GATE_ID}...")
    print(f"[SYSTEM] URL del Backend: {BACKEND_URL}")
    while True:
        try:
            url = f"{BACKEND_URL}/v1/system/heartbeat?gate_id={GATE_ID}"
            resp = requests.post(url, timeout=5)
            if resp.status_code == 200:
                # print(f"[OK] Latido enviado correctamente ({GATE_ID})") # Muy ruidoso
                pass
            else:
                print(f"[!] Heartbeat falló: HTTP {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"❌ [!] Error de red en heartbeat: {e}")
            print(f"    Verifique que el Backend esté corriendo en {BACKEND_URL}")
        time.sleep(15) # Más frecuente para debugeo inicial

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

            # --- INTENTO 3: Imagen Invertida (Para patentes negras de formato viejo) ---
            # Invertimos y aplicamos un umbral adaptativo para que las letras blancas se vuelvan negras definidas
            inverted = 255 - gray
            thresh_inv = cv2.adaptiveThreshold(inverted, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2)
            res_inv = reader.readtext(thresh_inv, detail=0)
            
            # Combinamos todos los resultados para validación
            all_detected = res + res_skew + res_inv
            candidates = list(set(all_detected)) # Eliminar duplicados obvios
            
            # También probamos concatenar fragmentos si el OCR los separó
            if len(all_detected) > 1:
                candidates.append("".join(all_detected))
            
            now = time.time()
            for text in candidates:
                plate = normalize_plate(text)
                
                if plate and 6 <= len(plate) <= 7:
                    plate_buffer.append(plate)
                    if len(plate_buffer) > 10: plate_buffer.pop(0) # Buffer un poco más grande
                    
                    if plate_buffer.count(plate) >= 2: # CONSENSO 2X (Más rápido para pantallas)
                        if plate != last_detected_plate or (now - last_detection_time > COOLDOWN_SECONDS):
                            print(f"\n[VALIDADO 2X] >>> {plate} <<<")
                            send_to_backend_async(plate, img_orig)
                            last_detected_plate = plate
                            last_detection_time = now
                            plate_buffer = [] 
                            break 
                elif not plate and len(plate_buffer) > 0:
                    # Si en este cuadro no hubo nada, empezamos a limpiar el buffer lentamente
                    if now % 2 == 0: plate_buffer.pop(0)
        
        time.sleep(0.01)
        
        time.sleep(0.01)

def main():
    global frame_to_process, frame_to_stream
    
    # Intentar optimizar apertura de stream
    cap = cv2.VideoCapture(VIDEO_SOURCE, cv2.CAP_FFMPEG)
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1) # Minimizar lag
    
    if not cap.isOpened():
        print(f"[CRITICAL] No se pudo abrir la fuente: {VIDEO_SOURCE}")
        return

    threading.Thread(target=ocr_worker, daemon=True).start()
    threading.Thread(target=heartbeat_worker, daemon=True).start()
    threading.Thread(target=video_stream_worker, daemon=True).start()
    print("[*] Buscando patentes... (q para salir)")

    while True:
        ret, frame = cap.read()
        if not ret:
            print("[!] Perdiendo frames... reintentando")
            time.sleep(1)
            cap.open(VIDEO_SOURCE)
            continue
        
        frame_to_process = frame.copy()
        frame_to_stream = frame.copy() # Alimentamos el hilo de streaming

        if cv2.waitKey(1) & 0xFF == ord('q'): break

    cap.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    main()
