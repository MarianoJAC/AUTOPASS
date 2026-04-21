from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
import models, schemas, database
from database import engine, get_db
import datetime
import json
import paho.mqtt.client as mqtt
from dotenv import load_dotenv
import os
import re

from paho.mqtt.enums import CallbackAPIVersion

load_dotenv()

# Configuración MQTT
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))
MQTT_TOPIC_ENTRADA = os.getenv("MQTT_TOPIC_ENTRADA", "parking/barrera/entrada/control")
MQTT_TOPIC_SALIDA = os.getenv("MQTT_TOPIC_SALIDA", "parking/barrera/salida/control")

mqtt_client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2)

def on_connect(client, userdata, flags, rc, properties=None):
    print(f"Conectado al Broker MQTT con código: {rc}")

mqtt_client.on_connect = on_connect

# Crear las tablas en la base de datos
models.Base.metadata.create_all(bind=engine)

from fastapi.staticfiles import StaticFiles
import base64

# Crear carpeta para imágenes si no existe
IMAGE_DIR = "captured_images"
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

app = FastAPI(title="ParkingTech API", version="1.0.0")

# Servir imágenes estáticas
app.mount("/images", StaticFiles(directory=IMAGE_DIR), name="images")

# Configuración CORS
 más permisiva
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
    except Exception as e:
        print(f"Error al conectar MQTT: {e}")

    db = next(get_db())
    try:
        aforo = db.query(models.ParkingAforo).first()
        if not aforo:
            nuevo_aforo = models.ParkingAforo(
                capacidad_total=20,
                ocupacion_actual=0,
                ultima_actualizacion=datetime.datetime.now().isoformat()
            )
            db.add(nuevo_aforo)
            db.commit()
    except Exception as e:
        print(f"Error inicializando aforo: {e}")
    finally:
        db.close()

from fastapi.responses import HTMLResponse

@app.get("/dashboard", response_class=HTMLResponse)
def get_dashboard_page():
    with open("dashboard.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de ParkingTech"}

@app.get("/parking/status", response_model=schemas.ParkingStatus)
def get_parking_status(db: Session = Depends(get_db)):
    aforo = db.query(models.ParkingAforo).first()
    return {
        "capacidad_total": aforo.capacidad_total,
        "ocupacion_actual": aforo.ocupacion_actual,
        "disponibilidad": aforo.capacidad_total - aforo.ocupacion_actual
    }

def normalize_plate(plate: str) -> str:
    # Eliminar cualquier carácter no alfanumérico y pasar a mayúsculas
    return re.sub(r'[^A-Z0-9]', '', plate.upper())

def publish_open_gate(plate: str, topic: str = MQTT_TOPIC_ENTRADA):
    payload = {
        "command": "OPEN",
        "plate": plate,
        "timestamp": datetime.datetime.now().isoformat()
    }
    mqtt_client.publish(topic, json.dumps(payload))

@app.post("/access/validate-plate", response_model=schemas.AccessResponse)
def validate_plate(data: schemas.PlateValidation, db: Session = Depends(get_db)):
    normalized_plate = normalize_plate(data.plate)
    now = datetime.datetime.now().isoformat()
    
    # Procesar imagen si viene
    image_filename = None
    if data.image_base64:
        try:
            image_filename = f"{normalized_plate}_{datetime.datetime.now().strftime('%Y%m%d_%H%M%S')}.jpg"
            image_path = os.path.join(IMAGE_DIR, image_filename)
            with open(image_path, "wb") as f:
                f.write(base64.b64decode(data.image_base64))
        except Exception as e:
            print(f"Error guardando imagen: {e}")

    reserva = db.query(models.Reservation).filter(
        models.Reservation.patente == normalized_plate,
        models.Reservation.estado_reserva == "Pendiente",
        models.Reservation.fecha_inicio <= now,
        models.Reservation.fecha_fin >= now
    ).first()

    aforo = db.query(models.ParkingAforo).first()

    if reserva:
        aforo.ocupacion_actual += 1
        aforo.ultima_actualizacion = now
        nuevo_log = models.AccessLog(
            patente_detectada=normalized_plate,
            tipo_evento="ENTRADA",
            reserva_id=reserva.id,
            fecha_hora=now,
            imagen_path=image_filename
        )
        db.add(nuevo_log)
        db.commit()
        publish_open_gate(normalized_plate, topic=MQTT_TOPIC_ENTRADA)
        return {
            "status": "allowed",
            "action": "OPEN_GATE",
            "message": f"Bienvenido. Acceso por reserva habilitado para {normalized_plate}"
        }

    if aforo.ocupacion_actual < aforo.capacidad_total:
        aforo.ocupacion_actual += 1
        aforo.ultima_actualizacion = now
        nuevo_log = models.AccessLog(
            patente_detectada=normalized_plate,
            tipo_evento="ENTRADA",
            fecha_hora=now,
            imagen_path=image_filename
        )
        db.add(nuevo_log)
        db.commit()
        publish_open_gate(normalized_plate, topic=MQTT_TOPIC_ENTRADA)
        return {
            "status": "allowed",
            "action": "OPEN_GATE",
            "message": f"Bienvenido. Acceso 'Al Paso' habilitado para {normalized_plate}"
        }

    return {
        "status": "denied",
        "action": "KEEP_CLOSED",
        "message": "Parking lleno. No hay cupos disponibles."
    }

@app.post("/access/exit-plate", response_model=schemas.AccessResponse)
def exit_plate(data: schemas.PlateValidation, db: Session = Depends(get_db)):
    normalized_plate = normalize_plate(data.plate)
    now_dt = datetime.datetime.now()
    now = now_dt.isoformat()
    
    aforo = db.query(models.ParkingAforo).first()
    
    # 1. Buscar el último ingreso de esta patente
    ultimo_ingreso = db.query(models.AccessLog).filter(
        models.AccessLog.patente_detectada == normalized_plate,
        models.AccessLog.tipo_evento == "ENTRADA"
    ).order_by(models.AccessLog.fecha_hora.desc()).first()

    # 2. Verificar si este ingreso ya tiene una salida (para no usar ingresos viejos)
    if ultimo_ingreso:
        salida_existente = db.query(models.AccessLog).filter(
            models.AccessLog.patente_detectada == normalized_plate,
            models.AccessLog.tipo_evento == "SALIDA",
            models.AccessLog.fecha_hora > ultimo_ingreso.fecha_hora
        ).first()
        
        if salida_existente:
            ultimo_ingreso = None # El último ingreso ya fue "cerrado" por una salida

    if not ultimo_ingreso:
         return {"status": "error", "action": "KEEP_CLOSED", "message": f"No se encontró registro de entrada activo para {normalized_plate}."}

    # 3. VERIFICACIÓN DE PAGO
    esta_pago = False
    if ultimo_ingreso.reserva_id:
        if ultimo_ingreso.reservation and ultimo_ingreso.reservation.estado_pago == "Pagado":
            esta_pago = True
    else:
        if ultimo_ingreso.pago_confirmado:
            esta_pago = True

    if not esta_pago:
        entrada_dt = datetime.datetime.fromisoformat(ultimo_ingreso.fecha_hora)
        duracion = now_dt - entrada_dt
        horas = max(1, duracion.total_seconds() / 3600)
        costo = round(horas * 100, 2)
        return {
            "status": "denied",
            "action": "KEEP_CLOSED",
            "message": f"Pago pendiente para {normalized_plate}. Total: ${costo}. Por favor, abone en caja."
        }

    # 4. Si está pago, proceder con la salida
    if aforo.ocupacion_actual > 0:
        aforo.ocupacion_actual -= 1
    aforo.ultima_actualizacion = now
    
    nuevo_log = models.AccessLog(
        patente_detectada=normalized_plate,
        tipo_evento="SALIDA",
        fecha_hora=now,
        pago_confirmado=True
    )
    db.add(nuevo_log)
    db.commit()

    publish_open_gate(normalized_plate, topic=MQTT_TOPIC_SALIDA)

    return {
        "status": "allowed",
        "action": "OPEN_GATE",
        "message": f"Hasta luego {normalized_plate}. Gracias por su visita."
    }

@app.post("/access/pay-stay")
def pay_stay(plate: str, db: Session = Depends(get_db)):
    normalized_plate = normalize_plate(plate)
    ultimo_ingreso = db.query(models.AccessLog).filter(
        models.AccessLog.patente_detectada == normalized_plate,
        models.AccessLog.tipo_evento == "ENTRADA",
        models.AccessLog.pago_confirmado == False
    ).order_by(models.AccessLog.fecha_hora.desc()).first()
    
    if ultimo_ingreso:
        ultimo_ingreso.pago_confirmado = True
        db.commit()
        return {"status": "ok", "message": f"Pago confirmado para {normalized_plate}. La barrera se abrirá al salir."}
    return {"status": "error", "message": "No hay deudas pendientes para esta patente."}

@app.post("/access/control-gate")
def control_gate(gate_id: str, command: str):
    topic = MQTT_TOPIC_ENTRADA if "ENTRADA" in gate_id.upper() else MQTT_TOPIC_SALIDA
    payload = {
        "command": command.upper(),
        "plate": "MANUAL",
        "timestamp": datetime.datetime.now().isoformat()
    }
    mqtt_client.publish(topic, json.dumps(payload))
    return {"status": "ok", "message": f"Comando {command} enviado a {gate_id}"}

@app.get("/access/logs")
def get_access_logs(db: Session = Depends(get_db)):
    try:
        logs = db.query(models.AccessLog).order_by(models.AccessLog.id.desc()).limit(10).all()
        return logs
    except Exception as e:
        print(f"Error en get_access_logs: {e}")
        raise HTTPException(status_code=500, detail=str(e))
