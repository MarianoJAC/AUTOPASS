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

# Configuración CORS más permisiva
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

# --- GESTIÓN DE TARIFAS ---

@app.get("/settings/prices")
def get_prices(db: Session = Depends(get_db)):
    prices = db.query(models.Settings).all()
    return {p.clave: p.valor for p in prices}

@app.post("/settings/prices")
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
    # Usamos una comparación de strings que funciona bien con el formato ISO de datetime-local
    reservas = db.query(models.Reservation).filter(
        models.Reservation.patente == normalized_plate,
        models.Reservation.estado_reserva == "Pendiente",
        models.Reservation.fecha_inicio <= now_iso
    ).all()

    reserva_valida = None
    for res in reservas:
        # Verificar fin de reserva
        if res.fecha_fin < now_iso and not res.dias_semana:
            continue

        # Si tiene días específicos, verificar si hoy es uno de esos días
        if res.dias_semana:
            dias_permitidos = res.dias_semana.split(",")
            if current_day not in dias_permitidos:
                continue
        
        # Verificar rango horario
        try:
            # Extraer solo la parte de la hora HH:MM de la fecha guardada
            # El formato de datetime-local es 2023-10-27T10:30
            hora_inicio_res = res.fecha_inicio.split("T")[1] if "T" in res.fecha_inicio else "00:00"
            hora_fin_res = res.fecha_fin.split("T")[1] if "T" in res.fecha_fin else "23:59"
            
            if hora_inicio_res <= current_time_str <= hora_fin_res:
                reserva_valida = res
                break
        except Exception as e:
            print(f"Error comparando horas: {e}")
            reserva_valida = res
            break

    aforo = db.query(models.ParkingAforo).first()

    if reserva_valida:
        aforo.ocupacion_actual += 1
        aforo.ultima_actualizacion = now_iso
        nuevo_log = models.AccessLog(
            patente_detectada=normalized_plate,
            tipo_evento="ENTRADA",
            reserva_id=reserva_valida.id,
            fecha_hora=now_iso,
            imagen_path=image_filename
        )
        db.add(nuevo_log)
        db.commit()
        publish_open_gate(normalized_plate, topic=MQTT_TOPIC_ENTRADA)
        return {
            "status": "allowed",
            "action": "OPEN_GATE",
            "message": f"Bienvenido. Reserva activa detectada para {normalized_plate}"
        }

    if aforo.ocupacion_actual < aforo.capacidad_total:
        aforo.ocupacion_actual += 1
        aforo.ultima_actualizacion = now_iso
        nuevo_log = models.AccessLog(
            patente_detectada=normalized_plate,
            tipo_evento="ENTRADA",
            fecha_hora=now_iso,
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
        
        # Obtener precio dinámico
        precio_hora_setting = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
        precio_val = precio_hora_setting.valor if precio_hora_setting else 100.0
        
        costo = round(horas * precio_val, 2)
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

# --- GESTIÓN DE RESERVAS MANUALES ---

@app.post("/reservations/admin")
def create_admin_reservation(res: schemas.AdminReservationCreate, db: Session = Depends(get_db)):
    try:
        nueva_reserva = models.Reservation(
            patente=normalize_plate(res.patente),
            fecha_inicio=res.fecha_inicio,
            fecha_fin=res.fecha_fin,
            dias_semana=res.dias_semana,
            monto_total=res.monto_total,
            estado_pago="Pagado", # Reservas admin se consideran pagas o a arreglar luego
            estado_reserva="Pendiente"
        )
        db.add(nueva_reserva)
        db.commit()
        return {"status": "ok", "message": f"Reserva creada para {res.patente}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/reservations/list")
def list_reservations(db: Session = Depends(get_db)):
    reservas = db.query(models.Reservation).order_by(models.Reservation.fecha_inicio.desc()).limit(20).all()
    now_iso = datetime.datetime.now().isoformat()
    
    resultado = []
    for r in reservas:
        estado_real = "Vigente"
        if r.fecha_fin < now_iso:
            estado_real = "Vencida"
        elif r.fecha_inicio > now_iso:
            estado_real = "Programada"
        
        # Verificar si el auto está adentro actualmente
        ultimo_log = db.query(models.AccessLog).filter(
            models.AccessLog.patente_detectada == r.patente
        ).order_by(models.AccessLog.id.desc()).first()
        
        if ultimo_log and ultimo_log.tipo_evento == "ENTRADA":
            # Si el último evento fue entrada, está adentro
            # Verificamos si no hay una salida posterior a esa entrada
            tiene_salida = db.query(models.AccessLog).filter(
                models.AccessLog.patente_detectada == r.patente,
                models.AccessLog.tipo_evento == "SALIDA",
                models.AccessLog.id > ultimo_log.id
            ).first()
            
            if not tiene_salida:
                estado_real = "En Uso"

        # Convertir objeto a dict y añadir el estado calculado
        r_dict = {
            "id": r.id,
            "patente": r.patente,
            "fecha_inicio": r.fecha_inicio,
            "fecha_fin": r.fecha_fin,
            "dias_semana": r.dias_semana,
            "estado_pago": r.estado_pago,
            "estado_reserva": estado_real # Sobrescribimos con el estado dinámico
        }
        resultado.append(r_dict)
        
    return resultado

@app.get("/parking/current-occupancy")
def get_current_occupancy(db: Session = Depends(get_db)):
    # 1. Obtener precio actual
    precio_hora_setting = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
    precio_val = precio_hora_setting.valor if precio_hora_setting else 100.0
    
    now_dt = datetime.datetime.now()
    
    # 2. Buscar todos los ingresos
    # Una forma simple: buscar todas las ENTRADAS y ver si tienen SALIDA posterior
    todas_entradas = db.query(models.AccessLog).filter(models.AccessLog.tipo_evento == "ENTRADA").all()
    
    ocupantes = []
    for entrada in todas_entradas:
        # Verificar si ya salió
        tiene_salida = db.query(models.AccessLog).filter(
            models.AccessLog.patente_detectada == entrada.patente_detectada,
            models.AccessLog.tipo_evento == "SALIDA",
            models.AccessLog.fecha_hora > entrada.fecha_hora
        ).first()
        
        if not tiene_salida:
            # Está adentro. Calcular deuda
            entrada_dt = datetime.datetime.fromisoformat(entrada.fecha_hora)
            duracion = now_dt - entrada_dt
            horas = max(1, duracion.total_seconds() / 3600)
            
            # Ver si es reserva pagada
            ya_pago = entrada.pago_confirmado
            if entrada.reserva_id and entrada.reservation:
                if entrada.reservation.estado_pago == "Pagado":
                    ya_pago = True
            
            deuda = round(horas * precio_val, 2) if not ya_pago else 0.0
            
            ocupantes.append({
                "patente": entrada.patente_detectada,
                "ingreso": entrada.fecha_hora,
                "deuda": deuda,
                "ya_pago": ya_pago,
                "es_reserva": entrada.reserva_id is not None
            })
            
    return ocupantes
