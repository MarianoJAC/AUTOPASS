from fastapi import FastAPI, Depends, HTTPException, Response, Request, APIRouter
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from sqlalchemy import text
import models, schemas, database, auth
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
import auth_routes
from typing import List

load_dotenv()

# --- CONFIGURACIÓN INICIAL ---
app = FastAPI(title="AUTOPASS API", version="2.6.0")
IMAGE_DIR = "captured_images"
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

app.mount("/images", StaticFiles(directory=IMAGE_DIR), name="images")
app.mount("/static", StaticFiles(directory="static"), name="static")
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

# --- UTILIDADES ---

def normalize_plate(p: str): return re.sub(r'[^A-Z0-9]', '', p.upper())

def publish_open_gate(plate: str, topic: str):
    mqtt_client.publish(topic, json.dumps({"command": "OPEN", "plate": plate, "timestamp": datetime.datetime.now().isoformat()}))

def calculate_debt(entry_time_str: str, db: Session):
    precio_hora_setting = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
    precio_hora = precio_hora_setting.valor if precio_hora_setting else 100.0
    entrada_dt = datetime.datetime.fromisoformat(entry_time_str)
    # Cálculo: (Ahora - Entrada) en horas, mínimo 1 hora
    horas = (datetime.datetime.now() - entrada_dt).total_seconds() / 3600
    return max(precio_hora, round(horas * precio_hora, 2))

# --- DEPENDENCIAS DE ROL ---
def get_admin_user(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos de administrador")
    return current_user

# --- VIDEO STREAMING LOGIC ---

@app.post("/v1/system/update-frame/{camera_id}")
async def update_frame(camera_id: str, request: Request):
    raw_body = await request.json()
    if "image" in raw_body:
        video_feeds[camera_id] = raw_body["image"]
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
        time.sleep(0.01)

@app.get("/v1/system/video-feed/{camera_id}")
async def video_feed(camera_id: str):
    return StreamingResponse(gen_frames(camera_id),
                             media_type="multipart/x-mixed-replace; boundary=frame")

# --- API ROUTER ---
api_v1 = APIRouter(prefix="/v1")

@app.on_event("startup")
def startup_event():
    try:
        mqtt_client.connect_async(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
    except Exception as e: 
        print(f"Error MQTT: {e}")

# --- RUTAS ADMINISTRATIVAS (PROTEGIDAS) ---

@api_v1.post("/system/reset")
def reset_system(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    db.query(models.AccessLog).delete()
    aforo = db.query(models.ParkingAforo).first()
    if aforo: aforo.ocupacion_actual = 0
    db.query(models.Reservation).delete()
    db.query(models.Vehicle).delete()
    db.query(models.User).filter(models.User.rol != 'admin').delete()
    db.commit()
    if os.path.exists(IMAGE_DIR):
        for f in os.listdir(IMAGE_DIR): os.unlink(os.path.join(IMAGE_DIR, f))
    return {"status": "ok"}

@api_v1.get("/admin/users")
def list_users(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    return db.query(models.User).all()

@api_v1.get("/settings/prices")
def get_prices(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    return {p.clave: p.valor for p in db.query(models.Settings).all()}

@api_v1.post("/settings/prices")
def update_price(clave: str, valor: float, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    setting = db.query(models.Settings).filter(models.Settings.clave == clave).first()
    if setting: setting.valor = valor
    else: db.add(models.Settings(clave=clave, valor=valor))
    db.commit()
    return {"status": "ok"}

@api_v1.get("/reports/financial-summary")
def get_financial_summary(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    # Sumamos costo_estadia de TODOS los registros donde pago_confirmado es True
    # Independientemente de si es entrada o salida (aunque usualmente se guarda en la entrada al cobrar)
    total = db.query(text("SELECT SUM(costo_estadia) FROM access_logs WHERE pago_confirmado = 1")).scalar() or 0.0
    cantidad = db.query(models.AccessLog).filter(models.AccessLog.pago_confirmado == True, models.AccessLog.costo_estadia > 0).count()
    
    return {
        "total_recaudado": round(total, 2), 
        "cantidad_pagos": cantidad, 
        "ticket_promedio": round(total/cantidad, 2) if cantidad > 0 else 0
    }

@api_v1.get("/reports/payment-history")
def get_payment_history(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    return db.query(models.AccessLog).filter(models.AccessLog.pago_confirmado == True, models.AccessLog.costo_estadia > 0).order_by(models.AccessLog.id.desc()).all()

@api_v1.get("/reports/access")
def get_reports_access(patente: str = None, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    q = db.query(models.AccessLog)
    if patente: q = q.filter(models.AccessLog.patente_detectada.like(f"%{patente.upper()}%"))
    return q.order_by(models.AccessLog.id.desc()).all()

@api_v1.post("/access/control-gate")
def control_gate(gate_id: str, command: str, admin: models.User = Depends(get_admin_user)):
    publish_open_gate("MANUAL", MQTT_TOPIC_ENTRADA if "ENTRADA" in gate_id.upper() else MQTT_TOPIC_SALIDA)
    return {"status": "ok"}

@api_v1.get("/access/logs")
def get_access_logs(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    return db.query(models.AccessLog).order_by(models.AccessLog.id.desc()).limit(15).all()

@api_v1.post("/admin/manual-entry")
def manual_entry(plate: str, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    p = normalize_plate(plate)
    now = datetime.datetime.now()
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if ultimo and ultimo.tipo_evento == "ENTRADA":
        raise HTTPException(status_code=400, detail="El vehículo ya figura como ingresado")
    aforo = db.query(models.ParkingAforo).first()
    aforo.ocupacion_actual += 1
    db.add(models.AccessLog(patente_detectada=p, tipo_evento="ENTRADA", fecha_hora=now.isoformat()))
    db.commit()
    publish_open_gate(p, MQTT_TOPIC_ENTRADA)
    return {"status": "ok", "message": f"Ingreso manual: {p}"}

@api_v1.post("/admin/manual-exit")
def manual_exit(plate: str, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    p = normalize_plate(plate)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if not ultimo or ultimo.tipo_evento != "ENTRADA":
        raise HTTPException(status_code=400, detail="El vehículo no figura en el predio")
    if not ultimo.pago_confirmado:
        raise HTTPException(status_code=403, detail="DEUDA PENDIENTE. Debe cobrar antes de permitir la salida.")
    aforo = db.query(models.ParkingAforo).first()
    if aforo.ocupacion_actual > 0: aforo.ocupacion_actual -= 1
    db.add(models.AccessLog(patente_detectada=p, tipo_evento="SALIDA", fecha_hora=datetime.datetime.now().isoformat(), pago_confirmado=True))
    db.commit()
    publish_open_gate(p, MQTT_TOPIC_SALIDA)
    return {"status": "ok", "message": f"Salida manual: {p}"}

# --- RUTAS DE USUARIO (PROTEGIDAS) ---

@api_v1.get("/user/me", response_model=schemas.UserBase)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@api_v1.get("/user/vehicles")
def get_user_vehicles(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Vehicle).filter(models.Vehicle.user_id == current_user.id).all()

@api_v1.post("/user/vehicles")
def add_user_vehicle(patente: str, marca_modelo: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    p = normalize_plate(patente)
    existing = db.query(models.Vehicle).filter(models.Vehicle.patente == p).first()
    if existing: raise HTTPException(status_code=400, detail="La patente ya está registrada")
    new_vehicle = models.Vehicle(user_id=current_user.id, patente=p, marca_modelo=marca_modelo)
    db.add(new_vehicle)
    db.commit()
    return {"status": "ok"}

@api_v1.get("/user/active-stays")
def get_user_active_stays(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    user_plates = [v.patente for v in current_user.vehicles]
    res = []
    for p in user_plates:
        ultimo_ingreso = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p, models.AccessLog.tipo_evento == "ENTRADA").order_by(models.AccessLog.id.desc()).first()
        if ultimo_ingreso:
            tiene_salida = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p, models.AccessLog.tipo_evento == "SALIDA", models.AccessLog.fecha_hora > ultimo_ingreso.fecha_hora).first()
            if not tiene_salida:
                deuda = 0.0 if ultimo_ingreso.pago_confirmado else calculate_debt(ultimo_ingreso.fecha_hora, db)
                res.append({"patente": p, "ingreso": ultimo_ingreso.fecha_hora, "deuda": deuda, "pago_confirmado": ultimo_ingreso.pago_confirmado})
    return res

@api_v1.get("/user/payment-history")
def get_user_payment_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    user_plates = [v.patente for v in current_user.vehicles]
    return db.query(models.AccessLog).filter(
        models.AccessLog.patente_detectada.in_(user_plates),
        models.AccessLog.pago_confirmado == True,
        models.AccessLog.costo_estadia > 0
    ).order_by(models.AccessLog.id.desc()).all()

@api_v1.get("/user/reservations", response_model=List[schemas.UserReservationResponse])
def get_user_reservations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Reservation).filter(models.Reservation.user_id == current_user.id).all()

@api_v1.post("/user/reservations")
def create_user_reservation(res: schemas.UserReservationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.patente == res.patente, models.Vehicle.user_id == current_user.id).first()
    if not vehicle: raise HTTPException(status_code=400, detail="Patente no vinculada a su cuenta")
    start = datetime.datetime.fromisoformat(res.fecha_inicio)
    end = datetime.datetime.fromisoformat(res.fecha_fin)
    duration_hours = (end - start).total_seconds() / 3600
    # Usamos la misma lógica de cálculo consolidada
    precio_hora_setting = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
    precio_hora = precio_hora_setting.valor if precio_hora_setting else 100.0
    monto = max(precio_hora, round(duration_hours * precio_hora, 2))
    new_res = models.Reservation(user_id=current_user.id, patente=res.patente, fecha_inicio=res.fecha_inicio, fecha_fin=res.fecha_fin, monto_total=monto, estado_pago="Pendiente", estado_reserva="Pendiente")
    db.add(new_res)
    db.commit()
    return {"status": "ok", "monto": monto}

# --- RUTAS PÚBLICAS / ALPR ---

ALPR_HEARTBEATS = {}
@api_v1.post("/system/heartbeat")
def alpr_heartbeat(gate_id: str):
    gate_id = gate_id.strip().upper()
    ALPR_HEARTBEATS[gate_id] = datetime.datetime.now()
    return {"status": "ok"}

@api_v1.get("/system/health")
def get_health(db: Session = Depends(get_db)):
    db_ok = True
    try: db.execute(text("SELECT 1"))
    except: db_ok = False
    now = datetime.datetime.now()
    alpr_status = {}
    for gate in ["ENTRADA_PRINCIPAL", "SALIDA_PRINCIPAL"]:
        status = "OFFLINE"
        if gate in ALPR_HEARTBEATS:
            if (now - ALPR_HEARTBEATS[gate]).total_seconds() < 90: status = "ONLINE"
        alpr_status[gate] = status
    return {"database": "ONLINE" if db_ok else "OFFLINE", "alpr": alpr_status, "api": "ONLINE"}

@api_v1.get("/parking/status", response_model=schemas.ParkingStatus)
def get_parking_status(db: Session = Depends(get_db)):
    a = db.query(models.ParkingAforo).first()
    return {"capacidad_total": a.capacidad_total, "ocupacion_actual": a.ocupacion_actual, "disponibilidad": a.capacidad_total - a.ocupacion_actual}

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
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if not ultimo or ultimo.tipo_evento != "ENTRADA": return {"status": "error", "message": "No registrado"}
    if not (ultimo.pago_confirmado or (ultimo.reservation and ultimo.reservation.estado_pago == "Pagado")):
        return {"status": "denied", "message": "Deuda pendiente"}
    aforo = db.query(models.ParkingAforo).first()
    if aforo.ocupacion_actual > 0: aforo.ocupacion_actual -= 1
    db.add(models.AccessLog(patente_detectada=p, tipo_evento="SALIDA", fecha_hora=datetime.datetime.now().isoformat(), pago_confirmado=True))
    db.commit()
    publish_open_gate(p, MQTT_TOPIC_SALIDA)
    return {"status": "allowed", "action": "OPEN_GATE", "message": f"Adiós {p}"}

@api_v1.post("/access/pay-stay")
def pay_stay(plate: str, db: Session = Depends(get_db)):
    p = normalize_plate(plate)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p, models.AccessLog.tipo_evento == "ENTRADA", models.AccessLog.pago_confirmado == False).order_by(models.AccessLog.id.desc()).first()
    if ultimo:
        monto_real = calculate_debt(ultimo.fecha_hora, db)
        ultimo.pago_confirmado = True
        ultimo.costo_estadia = monto_real
        
        # --- Lógica de Puntos AutoPass ---
        # Buscamos al dueño del vehículo
        vehiculo = db.query(models.Vehicle).filter(models.Vehicle.patente == p).first()
        if vehiculo and vehiculo.user:
            puntos_ganados = int(monto_real / 10) # 10 puntos por cada $100 (monto_real / 100 * 10)
            if puntos_ganados < 1: puntos_ganados = 1 # Mínimo 1 punto
            vehiculo.user.puntos += puntos_ganados
        
        db.commit()
        return {"status": "ok", "monto_cobrado": monto_real}
    return {"status": "error"}

@api_v1.get("/parking/current-occupancy")
def current_occupancy(db: Session = Depends(get_db)):
    entradas = db.query(models.AccessLog).filter(models.AccessLog.tipo_evento == "ENTRADA").all()
    res = []
    for e in entradas:
        tiene_salida = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == e.patente_detectada, models.AccessLog.tipo_evento == "SALIDA", models.AccessLog.fecha_hora > e.fecha_hora).first()
        if not tiene_salida:
            deuda = 0.0 if e.pago_confirmado else calculate_debt(e.fecha_hora, db)
            res.append({"patente": e.patente_detectada, "ingreso": e.fecha_hora, "deuda": deuda, "ya_pago": e.pago_confirmado, "es_reserva": e.reserva_id is not None})
    return res

# --- SERVIDO DE PÁGINAS HTML ---

@app.get("/dashboard", response_class=HTMLResponse)
def get_dashboard_page():
    with open("templates/dashboard.html", "r", encoding="utf-8") as f: return f.read()

@app.get("/perfil", response_class=HTMLResponse)
def get_perfil_page():
    with open("templates/perfil.html", "r", encoding="utf-8") as f: return f.read()

@app.get("/contacto", response_class=HTMLResponse)
def get_contact_page():
    with open("templates/contacto.html", "r", encoding="utf-8") as f: return f.read()

@app.get("/", response_class=HTMLResponse)
def get_index_page():
    with open("templates/index.html", "r", encoding="utf-8") as f: return f.read()

app.include_router(auth_routes.router)
app.include_router(api_v1)
