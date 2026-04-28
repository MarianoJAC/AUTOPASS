from fastapi import FastAPI, Depends, HTTPException, Response, Request, APIRouter
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
import models, schemas, database
from database import engine, get_db
import datetime
import json
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import os
import re
import base64
import shutil
import io
import csv
from paho.mqtt.enums import CallbackAPIVersion

load_dotenv()

# --- CONFIGURACIÓN INICIAL ---
app = FastAPI(title="AUTOPASS API", version="2.1.0")
IMAGE_DIR = "captured_images"
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

app.mount("/images", StaticFiles(directory=IMAGE_DIR), name="images")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Buffer global para video en vivo
video_feeds = {}

# --- MQTT SETUP ---
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC_ENTRADA = os.getenv("MQTT_TOPIC_ENTRADA", "parking/barrera/entrada/control")
MQTT_TOPIC_SALIDA = os.getenv("MQTT_TOPIC_SALIDA", "parking/barrera/salida/control")

mqtt_client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2)
def on_connect(client, userdata, flags, rc, properties=None):
    print(f"Conectado al Broker MQTT con código: {rc}")
mqtt_client.on_connect = on_connect

# Crear tablas
models.Base.metadata.create_all(bind=engine)

# --- VIDEO STREAMING LOGIC ---

@app.post("/v1/system/update-frame/{camera_id}")
async def update_frame(camera_id: str, request: Request):
    raw_body = await request.json()
    if "image" in raw_body:
        video_feeds[camera_id] = raw_body["image"]
        # print(f"Frame recibido de {camera_id}") # Debug
    return {"status": "ok"}

def gen_frames(camera_id: str):
    import time
    while True:
        frame_base64 = video_feeds.get(camera_id)
        if frame_base64:
            frame_bytes = base64.b64decode(frame_base64)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n'
                   b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n' + 
                   frame_bytes + b'\r\n')
        else:
            time.sleep(0.1)
            continue
        time.sleep(0.01) # Mínimo retraso para no saturar CPU pero ser instantáneo

@app.get("/v1/system/video-feed/{camera_id}")
async def video_feed(camera_id: str):
    return StreamingResponse(gen_frames(camera_id),
                             media_type="multipart/x-mixed-replace; boundary=frame")

# --- API ROUTER & ENDPOINTS ---
api_v1 = APIRouter(prefix="/v1")

@app.on_event("startup")
def startup_event():
    # --- MQTT ASYNC CONNECT ---
    try:
        # Usamos connect_async para que no bloquee el inicio del servidor si el broker tarda
        mqtt_client.connect_async(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        print(f"[*] MQTT: Intentando conexión en segundo plano a {MQTT_BROKER}...")
    except Exception as e: 
        print(f"Error MQTT: {e}")
    
    # --- DB INITIALIZATION ---
    db = next(get_db())
    try:
        if not db.query(models.ParkingAforo).first():
            db.add(models.ParkingAforo(capacidad_total=20, ocupacion_actual=0, ultima_actualizacion=datetime.datetime.now().isoformat()))
        if not db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first():
            db.add(models.Settings(clave="precio_hora", valor=100.0))
        db.commit()
    finally: db.close()

@api_v1.post("/system/reset")
def reset_system(db: Session = Depends(get_db)):
    try:
        db.query(models.AccessLog).delete()
        aforo = db.query(models.ParkingAforo).first()
        if aforo: aforo.ocupacion_actual = 0
        db.query(models.Reservation).delete()
        db.query(models.Vehicle).delete()
        db.query(models.User).delete()
        db.commit()
        if os.path.exists(IMAGE_DIR):
            for f in os.listdir(IMAGE_DIR): os.unlink(os.path.join(IMAGE_DIR, f))
        return {"status": "ok"}
    except Exception as e: return {"status": "error", "message": str(e)}

@api_v1.get("/settings/prices")
def get_prices(db: Session = Depends(get_db)):
    return {p.clave: p.valor for p in db.query(models.Settings).all()}

@api_v1.post("/settings/prices")
def update_price(clave: str, valor: float, db: Session = Depends(get_db)):
    setting = db.query(models.Settings).filter(models.Settings.clave == clave).first()
    if setting: setting.valor = valor
    else: db.add(models.Settings(clave=clave, valor=valor))
    db.commit()
    return {"status": "ok"}

ALPR_HEARTBEATS = {}
@api_v1.post("/system/heartbeat")
def alpr_heartbeat(gate_id: str):
    gate_id = gate_id.strip().upper()
    ALPR_HEARTBEATS[gate_id] = datetime.datetime.now()
    # print(f"[HEARTBEAT] Recibido de: {gate_id} a las {ALPR_HEARTBEATS[gate_id]}") # Debug
    return {"status": "ok"}

@api_v1.get("/system/health")
def get_health(db: Session = Depends(get_db)):
    db_ok = True
    try: db.execute(text("SELECT 1"))
    except: db_ok = False
    now = datetime.datetime.now()
    alpr_status = {}
    
    # Lista de cámaras esperadas por el Dashboard
    expected_gates = ["ENTRADA_PRINCIPAL", "SALIDA_PRINCIPAL"]
    
    for gate in expected_gates:
        status = "OFFLINE"
        if gate in ALPR_HEARTBEATS:
            diff = (now - ALPR_HEARTBEATS[gate]).total_seconds()
            if diff < 90: # Ventana de 90 segundos
                status = "ONLINE"
        alpr_status[gate] = status
    
    return {"database": "ONLINE" if db_ok else "OFFLINE", "alpr": alpr_status, "api": "ONLINE"}

@app.get("/dashboard", response_class=HTMLResponse)
def get_dashboard_page():
    with open("dashboard.html", "r", encoding="utf-8") as f: return f.read()

@app.get("/")
def read_root(): return {"message": "AUTOPASS API v2.1"}

@api_v1.get("/parking/status", response_model=schemas.ParkingStatus)
def get_parking_status(db: Session = Depends(get_db)):
    a = db.query(models.ParkingAforo).first()
    return {"capacidad_total": a.capacidad_total, "ocupacion_actual": a.ocupacion_actual, "disponibilidad": a.capacidad_total - a.ocupacion_actual}

def normalize_plate(p: str): return re.sub(r'[^A-Z0-9]', '', p.upper())

def publish_open_gate(plate: str, topic: str):
    mqtt_client.publish(topic, json.dumps({"command": "OPEN", "plate": plate, "timestamp": datetime.datetime.now().isoformat()}))

@api_v1.post("/access/validate-plate", response_model=schemas.AccessResponse)
def validate_plate(data: schemas.PlateValidation, db: Session = Depends(get_db)):
    p = normalize_plate(data.plate)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if ultimo and ultimo.tipo_evento == "ENTRADA": return {"status": "denied", "message": "Ya está dentro"}
    
    now = datetime.datetime.now()
    img_name = None
    if data.image_base64:
        img_name = f"{p}_{now.strftime('%H%M%S')}.jpg"
        with open(os.path.join(IMAGE_DIR, img_name), "wb") as f: f.write(base64.b64decode(data.image_base64))

    # Lógica de reserva simplificada para brevedad, igual a la original
    reserva = db.query(models.Reservation).filter(models.Reservation.patente == p, models.Reservation.estado_reserva == "Pendiente").first()
    aforo = db.query(models.ParkingAforo).first()

    if reserva or aforo.ocupacion_actual < aforo.capacidad_total:
        aforo.ocupacion_actual += 1
        db.add(models.AccessLog(patente_detectada=p, tipo_evento="ENTRADA", fecha_hora=now.isoformat(), imagen_path=img_name, reserva_id=reserva.id if reserva else None))
        db.commit()
        publish_open_gate(p, MQTT_TOPIC_ENTRADA)
        return {"status": "allowed", "action": "OPEN_GATE", "message": f"Bienvenido {p}"}
    return {"status": "denied", "message": "Lleno"}

@api_v1.post("/access/exit-plate", response_model=schemas.AccessResponse)
def exit_plate(data: schemas.PlateValidation, db: Session = Depends(get_db)):
    p = normalize_plate(data.plate)
    now = datetime.datetime.now()

    # Verificamos si el vehículo está realmente adentro (último evento debe ser ENTRADA)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()

    if not ultimo or ultimo.tipo_evento != "ENTRADA":
        return {"status": "error", "message": "Vehículo no registrado como ingresado"}

    # Verificación de pago
    pago_ok = ultimo.pago_confirmado or (ultimo.reservation and ultimo.reservation.estado_pago == "Pagado")
    if not pago_ok:
        return {"status": "denied", "message": "Deuda pendiente. Por favor pase por caja."}

    # Procesar imagen de salida si existe
    img_name = None
    if data.image_base64:
        img_name = f"EXIT_{p}_{now.strftime('%H%M%S')}.jpg"
        with open(os.path.join(IMAGE_DIR, img_name), "wb") as f:
            f.write(base64.b64decode(data.image_base64))

    # Registrar salida y actualizar aforo
    aforo = db.query(models.ParkingAforo).first()
    if aforo.ocupacion_actual > 0:
        aforo.ocupacion_actual -= 1

    nueva_salida = models.AccessLog(
        patente_detectada=p, 
        tipo_evento="SALIDA", 
        fecha_hora=now.isoformat(), 
        pago_confirmado=True,
        imagen_path=img_name
    )
    db.add(nueva_salida)
    db.commit()

    publish_open_gate(p, MQTT_TOPIC_SALIDA)
    return {"status": "allowed", "action": "OPEN_GATE", "message": f"Salida autorizada: {p}. ¡Vuelva pronto!"}
@api_v1.post("/access/pay-stay")
def pay_stay(plate: str, db: Session = Depends(get_db)):
    p = normalize_plate(plate)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p, models.AccessLog.tipo_evento == "ENTRADA", models.AccessLog.pago_confirmado == False).first()
    if ultimo:
        ultimo.pago_confirmado = True
        ultimo.costo_estadia = 100.0 # Simplificado
        db.commit()
        return {"status": "ok"}
    return {"status": "error"}

@api_v1.get("/reports/financial-summary")
def get_financial_summary(db: Session = Depends(get_db)):
    pagos = db.query(models.AccessLog).filter(models.AccessLog.pago_confirmado == True, models.AccessLog.tipo_evento == "ENTRADA").all()
    total = sum(p.costo_estadia for p in pagos)
    return {"total_recaudado": total, "cantidad_pagos": len(pagos), "ticket_promedio": total/len(pagos) if pagos else 0}

@api_v1.get("/reports/access")
def get_reports_access(patente: str = None, db: Session = Depends(get_db)):
    q = db.query(models.AccessLog)
    if patente: q = q.filter(models.AccessLog.patente_detectada.like(f"%{patente.upper()}%"))
    return q.order_by(models.AccessLog.id.desc()).all()

@api_v1.get("/reports/stats")
def get_reports_stats(db: Session = Depends(get_db)):
    stats = [0]*24
    logs = db.query(models.AccessLog).filter(models.AccessLog.tipo_evento == "ENTRADA").all()
    for l in logs:
        try: stats[int(l.fecha_hora.split("T")[1].split(":")[0])] += 1
        except: pass
    return stats

@api_v1.post("/access/control-gate")
def control_gate(gate_id: str, command: str):
    publish_open_gate("MANUAL", MQTT_TOPIC_ENTRADA if "ENTRADA" in gate_id.upper() else MQTT_TOPIC_SALIDA)
    return {"status": "ok"}

@api_v1.get("/access/logs")
def get_access_logs(db: Session = Depends(get_db)):
    return db.query(models.AccessLog).order_by(models.AccessLog.id.desc()).limit(10).all()

@api_v1.post("/reservations/admin")
def create_reservation(res: schemas.AdminReservationCreate, db: Session = Depends(get_db)):
    db.add(models.Reservation(patente=normalize_plate(res.patente), fecha_inicio=res.fecha_inicio, fecha_fin=res.fecha_fin, dias_semana=res.dias_semana, monto_total=res.monto_total, estado_pago="Pagado", estado_reserva="Pendiente"))
    db.commit()
    return {"status": "ok"}

@api_v1.get("/reservations/list")
def list_reservations(db: Session = Depends(get_db)):
    return db.query(models.Reservation).all()

@api_v1.get("/parking/current-occupancy")
def current_occupancy(db: Session = Depends(get_db)):
    entradas = db.query(models.AccessLog).filter(models.AccessLog.tipo_evento == "ENTRADA").all()
    precio_hora_setting = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
    precio_hora = precio_hora_setting.valor if precio_hora_setting else 100.0
    res = []
    for e in entradas:
        if not db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == e.patente_detectada, models.AccessLog.tipo_evento == "SALIDA", models.AccessLog.fecha_hora > e.fecha_hora).first():
            entrada_dt = datetime.datetime.fromisoformat(e.fecha_hora)
            horas = (datetime.datetime.now() - entrada_dt).total_seconds() / 3600
            deuda = max(precio_hora, round(horas * precio_hora, 2))
            res.append({"patente": e.patente_detectada, "ingreso": e.fecha_hora, "deuda": deuda, "ya_pago": e.pago_confirmado, "es_reserva": e.reserva_id is not None})
    return res

app.include_router(api_v1)
