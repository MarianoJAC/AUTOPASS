from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
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

app = FastAPI(title="AUTOPASS API", version="2.0.0")

# Servir imágenes estáticas
app.mount("/images", StaticFiles(directory=IMAGE_DIR), name="images")

# Configuración CORS más permisiva
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import APIRouter

api_v1 = APIRouter(prefix="/v1")

@app.on_event("startup")
def startup_event():
    try:
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
    except Exception as e:
        print(f"Error al conectar MQTT: {e}")

    db = next(get_db())
    try:
        # Inicializar aforo
        aforo = db.query(models.ParkingAforo).first()
        if not aforo:
            nuevo_aforo = models.ParkingAforo(
                capacidad_total=20,
                ocupacion_actual=0,
                ultima_actualizacion=datetime.datetime.now().isoformat()
            )
            db.add(nuevo_aforo)
        
        # Inicializar tarifas por defecto si no existen
        precio_hora = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
        if not precio_hora:
            db.add(models.Settings(clave="precio_hora", valor=100.0))
            
        db.commit()
    except Exception as e:
        print(f"Error inicializando datos: {e}")
    finally:
        db.close()

import shutil

@api_v1.post("/system/reset")
def reset_system(db: Session = Depends(get_db)):
    try:
        # 1. Borrar logs de acceso
        db.query(models.AccessLog).delete()
        
        # 2. Resetear aforo
        aforo = db.query(models.ParkingAforo).first()
        if aforo:
            aforo.ocupacion_actual = 0
        
        # 3. Borrar reservas, vehículos y usuarios
        db.query(models.Reservation).delete()
        db.query(models.Vehicle).delete()
        db.query(models.User).delete()
        
        db.commit()

        # 4. Limpiar carpeta de imágenes
        if os.path.exists(IMAGE_DIR):
            for filename in os.listdir(IMAGE_DIR):
                file_path = os.path.join(IMAGE_DIR, filename)
                try:
                    if os.path.isfile(file_path): os.unlink(file_path)
                except: pass
        
        return {"status": "ok", "message": "Sistema reseteado correctamente."}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- GESTIÓN DE TARIFAS ---

@api_v1.get("/settings/prices")
def get_prices(db: Session = Depends(get_db)):
    prices = db.query(models.Settings).all()
    return {p.clave: p.valor for p in prices}

@api_v1.post("/settings/prices")
def update_price(clave: str, valor: float, db: Session = Depends(get_db)):
    setting = db.query(models.Settings).filter(models.Settings.clave == clave).first()
    if setting:
        setting.valor = valor
    else:
        setting = models.Settings(clave=clave, valor=valor)
        db.add(setting)
    db.commit()
    return {"status": "ok", "message": f"Tarifa {clave} actualizada a ${valor}"}

from fastapi.responses import HTMLResponse

# --- ESTADO DEL SISTEMA (HEALTH) ---
ALPR_HEARTBEATS = {} # { gate_id: datetime }

@api_v1.post("/system/heartbeat")
def alpr_heartbeat(gate_id: str):
    global ALPR_HEARTBEATS
    ALPR_HEARTBEATS[gate_id] = datetime.datetime.now()
    return {"status": "ok"}

@api_v1.get("/system/health")
def get_health(db: Session = Depends(get_db)):
    # 1. Verificar Base de Datos
    db_ok = False
    try:
        db.execute(text("SELECT 1"))
        db_ok = True
    except:
        db_ok = False

    # 2. Verificar Cámaras (ALPR)
    now = datetime.datetime.now()
    alpr_status = {}
    
    # Revisamos los que conocemos o inicializamos los estándar
    for gate in ["ENTRADA_PRINCIPAL", "SALIDA_PRINCIPAL"]:
        status = "OFFLINE"
        if gate in ALPR_HEARTBEATS:
            diff = (now - ALPR_HEARTBEATS[gate]).total_seconds()
            if diff < 60: status = "ONLINE"
        alpr_status[gate] = status

    return {
        "database": "ONLINE" if db_ok else "OFFLINE",
        "alpr": alpr_status,
        "api": "ONLINE"
    }

@app.get("/dashboard", response_class=HTMLResponse)
def get_dashboard_page():
    with open("dashboard.html", "r", encoding="utf-8") as f:
        return f.read()

@app.get("/")
def read_root():
    return {"message": "Bienvenido a la API de AUTOPASS"}

@api_v1.get("/parking/status", response_model=schemas.ParkingStatus)
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

@api_v1.post("/access/validate-plate", response_model=schemas.AccessResponse)
def validate_plate(data: schemas.PlateValidation, db: Session = Depends(get_db)):
    normalized_plate = normalize_plate(data.plate)
    
    # --- VERIFICACIÓN DE DUPLICADOS (YA ESTÁ ADENTRO?) ---
    ultimo_log = db.query(models.AccessLog).filter(
        models.AccessLog.patente_detectada == normalized_plate
    ).order_by(models.AccessLog.id.desc()).first()
    
    if ultimo_log and ultimo_log.tipo_evento == "ENTRADA":
        return {
            "status": "denied",
            "action": "KEEP_CLOSED",
            "message": f"Acceso denegado: El vehículo {normalized_plate} ya se encuentra dentro del predio."
        }
    
    now_dt = datetime.datetime.now()
    now_iso = now_dt.isoformat()
    current_time_str = now_dt.strftime("%H:%M:%S")
    current_day = str(now_dt.weekday()) # 0=Lunes, 6=Domingo
    
    # Procesar imagen si viene
    image_filename = None
    if data.image_base64:
        try:
            image_filename = f"{normalized_plate}_{now_dt.strftime('%Y%m%d_%H%M%S')}.jpg"
            image_path = os.path.join(IMAGE_DIR, image_filename)
            with open(image_path, "wb") as f:
                f.write(base64.b64decode(data.image_base64))
        except Exception as e:
            print(f"Error guardando imagen: {e}")

    # Buscar reservas para esta patente que estén ACTIVAS hoy
    reservas = db.query(models.Reservation).filter(
        models.Reservation.patente == normalized_plate,
        models.Reservation.estado_reserva == "Pendiente",
        models.Reservation.fecha_inicio <= now_iso
    ).all()

    reserva_valida = None
    for res in reservas:
        if res.fecha_fin < now_iso and not res.dias_semana: continue
        if res.dias_semana:
            dias_permitidos = res.dias_semana.split(",")
            if current_day not in dias_permitidos: continue
        
        try:
            hora_inicio_res = res.fecha_inicio.split("T")[1] if "T" in res.fecha_inicio else "00:00"
            hora_fin_res = res.fecha_fin.split("T")[1] if "T" in res.fecha_fin else "23:59"
            if hora_inicio_res <= current_time_str <= hora_fin_res:
                reserva_valida = res
                break
        except:
            reserva_valida = res
            break

    aforo = db.query(models.ParkingAforo).first()

    if reserva_valida:
        aforo.ocupacion_actual += 1
        aforo.ultima_actualizacion = now_iso
        nuevo_log = models.AccessLog(
            patente_detectada=normalized_plate, tipo_evento="ENTRADA",
            reserva_id=reserva_valida.id, fecha_hora=now_iso, imagen_path=image_filename
        )
        db.add(nuevo_log)
        db.commit()
        publish_open_gate(normalized_plate, topic=MQTT_TOPIC_ENTRADA)
        return {"status": "allowed", "action": "OPEN_GATE", "message": f"Bienvenido. Reserva detectada para {normalized_plate}"}

    if aforo.ocupacion_actual < aforo.capacidad_total:
        aforo.ocupacion_actual += 1
        aforo.ultima_actualizacion = now_iso
        nuevo_log = models.AccessLog(
            patente_detectada=normalized_plate, tipo_evento="ENTRADA",
            fecha_hora=now_iso, imagen_path=image_filename
        )
        db.add(nuevo_log)
        db.commit()
        publish_open_gate(normalized_plate, topic=MQTT_TOPIC_ENTRADA)
        return {"status": "allowed", "action": "OPEN_GATE", "message": f"Bienvenido {normalized_plate}"}

    return {"status": "denied", "action": "KEEP_CLOSED", "message": "Parking lleno."}

@api_v1.post("/access/exit-plate", response_model=schemas.AccessResponse)
def exit_plate(data: schemas.PlateValidation, db: Session = Depends(get_db)):
    normalized_plate = normalize_plate(data.plate)
    now_dt = datetime.datetime.now()
    now = now_dt.isoformat()
    
    aforo = db.query(models.ParkingAforo).first()
    
    ultimo_ingreso = db.query(models.AccessLog).filter(
        models.AccessLog.patente_detectada == normalized_plate,
        models.AccessLog.tipo_evento == "ENTRADA"
    ).order_by(models.AccessLog.fecha_hora.desc()).first()

    if ultimo_ingreso:
        salida_existente = db.query(models.AccessLog).filter(
            models.AccessLog.patente_detectada == normalized_plate,
            models.AccessLog.tipo_evento == "SALIDA",
            models.AccessLog.fecha_hora > ultimo_ingreso.fecha_hora
        ).first()
        if salida_existente: ultimo_ingreso = None

    if not ultimo_ingreso:
         return {"status": "error", "action": "KEEP_CLOSED", "message": f"No hay entrada para {normalized_plate}."}

    esta_pago = False
    if ultimo_ingreso.reserva_id:
        if ultimo_ingreso.reservation and ultimo_ingreso.reservation.estado_pago == "Pagado": esta_pago = True
    else:
        if ultimo_ingreso.pago_confirmado: esta_pago = True

    if not esta_pago:
        entrada_dt = datetime.datetime.fromisoformat(ultimo_ingreso.fecha_hora)
        duracion = now_dt - entrada_dt
        horas = max(1, duracion.total_seconds() / 3600)
        precio_hora_setting = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
        precio_val = precio_hora_setting.valor if precio_hora_setting else 100.0
        costo = round(horas * precio_val, 2)
        return {"status": "denied", "action": "KEEP_CLOSED", "message": f"Pago pendiente: ${costo}"}

    if aforo.ocupacion_actual > 0: aforo.ocupacion_actual -= 1
    aforo.ultima_actualizacion = now
    nuevo_log = models.AccessLog(patente_detectada=normalized_plate, tipo_evento="SALIDA", fecha_hora=now, pago_confirmado=True)
    db.add(nuevo_log)
    db.commit()
    publish_open_gate(normalized_plate, topic=MQTT_TOPIC_SALIDA)
    return {"status": "allowed", "action": "OPEN_GATE", "message": f"Adiós {normalized_plate}"}

@api_v1.post("/access/pay-stay")
def pay_stay(plate: str, db: Session = Depends(get_db)):
    normalized_plate = normalize_plate(plate)
    ultimo_ingreso = db.query(models.AccessLog).filter(
        models.AccessLog.patente_detectada == normalized_plate,
        models.AccessLog.tipo_evento == "ENTRADA",
        models.AccessLog.pago_confirmado == False
    ).order_by(models.AccessLog.fecha_hora.desc()).first()
    
    if ultimo_ingreso:
        now_dt = datetime.datetime.now()
        entrada_dt = datetime.datetime.fromisoformat(ultimo_ingreso.fecha_hora)
        duracion = now_dt - entrada_dt
        horas = max(1, duracion.total_seconds() / 3600)
        precio_hora_setting = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
        precio_val = precio_hora_setting.valor if precio_hora_setting else 100.0
        costo = round(horas * precio_val, 2)

        ultimo_ingreso.pago_confirmado = True
        ultimo_ingreso.costo_estadia = costo
        db.commit()
        return {"status": "ok", "message": f"Pago de ${costo} confirmado."}
    return {"status": "error", "message": "No hay deudas."}

# --- REPORTES ---

@api_v1.get("/reports/financial-summary")
def get_financial_summary(db: Session = Depends(get_db)):
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    # Filtramos solo por ENTRADA para evitar duplicados con el log de SALIDA
    pagos_hoy = db.query(models.AccessLog).filter(
        models.AccessLog.pago_confirmado == True,
        models.AccessLog.tipo_evento == "ENTRADA",
        models.AccessLog.fecha_hora.like(f"{today}%")
    ).all()
    total = sum(p.costo_estadia for p in pagos_hoy)
    cantidad = len(pagos_hoy)
    ticket_promedio = round(total / cantidad, 2) if cantidad > 0 else 0
    return {"total_recaudado": total, "cantidad_pagos": cantidad, "ticket_promedio": ticket_promedio}

@api_v1.get("/reports/access")
def get_reports_access(patente: str = None, inicio: str = None, fin: str = None, db: Session = Depends(get_db)):
    query = db.query(models.AccessLog)
    if patente: query = query.filter(models.AccessLog.patente_detectada.like(f"%{patente.upper()}%"))
    if inicio: query = query.filter(models.AccessLog.fecha_hora >= inicio)
    if fin: query = query.filter(models.AccessLog.fecha_hora <= fin)
    return query.order_by(models.AccessLog.id.desc()).all()

import io, csv
from fastapi.responses import StreamingResponse

@api_v1.get("/reports/export")
def export_reports_csv(patente: str = None, inicio: str = None, fin: str = None, db: Session = Depends(get_db)):
    logs = get_reports_access(patente, inicio, fin, db)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Patente", "Evento", "Fecha/Hora", "Costo", "Pago"])
    for log in logs:
        writer.writerow([log.id, log.patente_detectada, log.tipo_evento, log.fecha_hora, log.costo_estadia, "SI" if log.pago_confirmado else "NO"])
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers={"Content-Disposition": "attachment; filename=reporte.csv"})

@api_v1.get("/reports/stats")
def get_reports_stats(db: Session = Depends(get_db)):
    today = datetime.datetime.now().strftime("%Y-%m-%d")
    logs = db.query(models.AccessLog).filter(models.AccessLog.tipo_evento == "ENTRADA", models.AccessLog.fecha_hora.like(f"{today}%")).all()
    stats = [0] * 24
    for log in logs:
        try:
            hora = int(log.fecha_hora.split("T")[1].split(":")[0])
            stats[hora] += 1
        except: continue
    return stats

@api_v1.post("/access/control-gate")
def control_gate(gate_id: str, command: str):
    topic = MQTT_TOPIC_ENTRADA if "ENTRADA" in gate_id.upper() else MQTT_TOPIC_SALIDA
    payload = {"command": command.upper(), "plate": "MANUAL", "timestamp": datetime.datetime.now().isoformat()}
    mqtt_client.publish(topic, json.dumps(payload))
    return {"status": "ok", "message": f"Comando {command} enviado"}

@api_v1.get("/access/logs")
def get_access_logs(db: Session = Depends(get_db)):
    return db.query(models.AccessLog).order_by(models.AccessLog.id.desc()).limit(10).all()

@api_v1.post("/reservations/admin")
def create_admin_reservation(res: schemas.AdminReservationCreate, db: Session = Depends(get_db)):
    nueva_reserva = models.Reservation(patente=normalize_plate(res.patente), fecha_inicio=res.fecha_inicio, fecha_fin=res.fecha_fin, dias_semana=res.dias_semana, monto_total=res.monto_total, estado_pago="Pagado", estado_reserva="Pendiente")
    db.add(nueva_reserva)
    db.commit()
    return {"status": "ok", "message": "Reserva creada"}

@api_v1.get("/reservations/list")
def list_reservations(db: Session = Depends(get_db)):
    reservas = db.query(models.Reservation).order_by(models.Reservation.fecha_inicio.desc()).limit(20).all()
    now_iso = datetime.datetime.now().isoformat()
    resultado = []
    for r in reservas:
        estado = "Vigente"
        if r.fecha_fin < now_iso: estado = "Vencida"
        elif r.fecha_inicio > now_iso: estado = "Programada"
        resultado.append({"id": r.id, "patente": r.patente, "fecha_inicio": r.fecha_inicio, "fecha_fin": r.fecha_fin, "dias_semana": r.dias_semana, "estado_pago": r.estado_pago, "estado_reserva": estado})
    return resultado

@api_v1.get("/parking/current-occupancy")
def get_current_occupancy(db: Session = Depends(get_db)):
    todas_entradas = db.query(models.AccessLog).filter(models.AccessLog.tipo_evento == "ENTRADA").all()
    ocupantes = []
    now_dt = datetime.datetime.now()
    precio_hora = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
    precio_val = precio_hora.valor if precio_hora else 100.0
    for entrada in todas_entradas:
        tiene_salida = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == entrada.patente_detectada, models.AccessLog.tipo_evento == "SALIDA", models.AccessLog.fecha_hora > entrada.fecha_hora).first()
        if not tiene_salida:
            entrada_dt = datetime.datetime.fromisoformat(entrada.fecha_hora)
            horas = max(1, (now_dt - entrada_dt).total_seconds() / 3600)
            ya_pago = entrada.pago_confirmado
            ocupantes.append({"patente": entrada.patente_detectada, "ingreso": entrada.fecha_hora, "deuda": round(horas * precio_val, 2) if not ya_pago else 0.0, "ya_pago": ya_pago, "es_reserva": entrada.reserva_id is not None})
    return ocupantes

app.include_router(api_v1)
