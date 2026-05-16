import datetime
import json
import re
import os
import base64
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db
from dotenv import load_dotenv
from services.billing_service import BillingService

load_dotenv()

router = APIRouter(prefix="/v1", tags=["Parking & Access"])

# Configuraciones de Integración
MQTT_TOPIC_ENTRADA = os.getenv("MQTT_TOPIC_ENTRADA", "parking/barrera/entrada/control")
MQTT_TOPIC_SALIDA = os.getenv("MQTT_TOPIC_SALIDA", "parking/barrera/salida/control")
IMAGE_DIR = os.getenv("IMAGE_DIR", "captured_images")

# --- UTILIDADES DE NORMALIZACIÓN ---

def normalize_plate(p: str): 
    """Elimina caracteres especiales y convierte a mayúsculas."""
    return re.sub(r'[^A-Z0-9]', '', p.upper())

def format_plate(p: str):
    """Aplica formato visual estándar a la patente (Ej: ABC 123)."""
    clean = normalize_plate(p)
    if len(clean) == 6: return f"{clean[:3]} {clean[3:]}"
    if len(clean) == 7: return f"{clean[:2]} {clean[2:5]} {clean[5:]}"
    return clean

def normalize_name(s: str):
    """Formatea nombres y apellidos."""
    return s.strip().title()

def normalize_dni(s: str):
    """Aplica formato de puntos al DNI para visualización."""
    clean = re.sub(r'[^0-9]', '', s)
    if len(clean) == 7: return f"{clean[0]}.{clean[1:4]}.{clean[4:]}"
    if len(clean) == 8: return f"{clean[:2]}.{clean[2:5]}.{clean[5:]}"
    return clean

# --- ENDPOINTS DE ESTADO ---

@router.get("/parking/status", response_model=schemas.ParkingStatus)
def get_parking_status(db: Session = Depends(get_db)):
    """Retorna la disponibilidad actual de plazas en el predio."""
    a = db.query(models.ParkingAforo).first()
    if not a: return {"capacidad_total": 20, "ocupacion_actual": 0, "disponibilidad": 20}
    return {"capacidad_total": a.capacidad_total, "ocupacion_actual": a.ocupacion_actual, "disponibilidad": a.capacidad_total - a.ocupacion_actual}

@router.get("/parking/current-occupancy")
def current_occupancy(db: Session = Depends(get_db)):
    """Lista todos los vehículos actualmente estacionados con su deuda calculada."""
    entradas = db.query(models.AccessLog).filter(models.AccessLog.tipo_evento == "ENTRADA").all()
    res = []
    for e in entradas:
        tiene_salida = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == e.patente_detectada, models.AccessLog.tipo_evento == "SALIDA", models.AccessLog.fecha_hora > e.fecha_hora).first()
        if not tiene_salida:
            deuda = 0.0 if e.pago_confirmado else BillingService.calculate_debt(e.fecha_hora, db)
            res.append({"patente": e.patente_detectada, "ingreso": e.fecha_hora, "deuda": deuda, "ya_pago": e.pago_confirmado, "es_reserva": e.reserva_id is not None})
    return res

# --- ENDPOINTS DE VALIDACIÓN ALPR ---

@router.post("/access/validate-plate", response_model=schemas.AccessResponse)
def validate_plate(data: schemas.PlateValidation, db: Session = Depends(get_db), request: Request = None):
    """Valida una patente detectada para permitir o denegar el ingreso."""
    p = normalize_plate(data.plate)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if ultimo and ultimo.tipo_evento == "ENTRADA": 
        return {"status": "denied", "message": "El vehículo ya figura dentro del predio"}
    
    now = datetime.datetime.now()
    img_name = None
    if data.image_base64:
        img_name = f"{p}_{now.strftime('%H%M%S')}.jpg"
        if not os.path.exists(IMAGE_DIR): os.makedirs(IMAGE_DIR)
        with open(os.path.join(IMAGE_DIR, img_name), "wb") as f: 
            f.write(base64.b64decode(data.image_base64))
            
    reserva = db.query(models.Reservation).filter(models.Reservation.patente == p, models.Reservation.estado_reserva == "Pendiente").first()
    aforo = db.query(models.ParkingAforo).first()
    
    if reserva or aforo.ocupacion_actual < aforo.capacidad_total:
        aforo.ocupacion_actual += 1
        if reserva: reserva.estado_reserva = "Activa"
        db.add(models.AccessLog(patente_detectada=p, tipo_evento="ENTRADA", fecha_hora=now.isoformat(), imagen_path=img_name, reserva_id=reserva.id if reserva else None))
        db.commit()
        
        # Notificación IoT para apertura de barrera
        if request and hasattr(request.app, 'mqtt_client'):
            request.app.mqtt_client.publish(MQTT_TOPIC_ENTRADA, json.dumps({"command": "OPEN", "plate": p, "timestamp": now.isoformat()}))
            
        return {"status": "allowed", "action": "OPEN_GATE", "message": f"Acceso permitido. Bienvenido {p}"}
    return {"status": "denied", "message": "Capacidad máxima alcanzada"}

@router.post("/access/exit-plate", response_model=schemas.AccessResponse)
def exit_plate(data: schemas.PlateValidation, db: Session = Depends(get_db), request: Request = None):
    """Valida la salida de un vehículo. Solo se permite si la deuda está saldada."""
    p = normalize_plate(data.plate)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if not ultimo or ultimo.tipo_evento != "ENTRADA": 
        return {"status": "error", "message": "El vehículo no tiene registro de ingreso"}
    
    if not (ultimo.pago_confirmado or (ultimo.reservation and ultimo.reservation.estado_pago == "Pagado")):
        return {"status": "denied", "message": "Deuda pendiente de pago"}
        
    aforo = db.query(models.ParkingAforo).first()
    if aforo.ocupacion_actual > 0: aforo.ocupacion_actual -= 1
        
    now = datetime.datetime.now()
    if ultimo.reservation: ultimo.reservation.estado_reserva = "Completada"
    db.add(models.AccessLog(patente_detectada=p, tipo_evento="SALIDA", fecha_hora=now.isoformat(), pago_confirmado=True))
    db.commit()
    
    if request and hasattr(request.app, 'mqtt_client'):
        request.app.mqtt_client.publish(MQTT_TOPIC_SALIDA, json.dumps({"command": "OPEN", "plate": p, "timestamp": now.isoformat()}))
        
    return {"status": "allowed", "action": "OPEN_GATE", "message": f"Salida autorizada. Adiós {p}"}

@router.post("/access/validate-qr", response_model=schemas.AccessResponse)
def validate_qr(data: schemas.QRValidation, db: Session = Depends(get_db), request: Request = None):
    """Valida un Pase Digital (QR) presentado en el tótem."""
    try:
        parts = data.qr_data.split('|')
        if len(parts) < 3 or parts[0] != "AUTOPASS":
            return {"status": "error", "message": "Formato de QR inválido"}
        
        # Extraer ID y Patente del formato "AUTOPASS|ID:123|PLATE:ABC123"
        reserva_id = int(parts[1].split(':')[1])
        patente = normalize_plate(parts[2].split(':')[1])
        
        reserva = db.query(models.Reservation).filter(models.Reservation.id == reserva_id).first()
        if not reserva:
            return {"status": "error", "message": "Reserva no encontrada"}
        
        if normalize_plate(reserva.patente) != patente:
            return {"status": "error", "message": "La patente del QR no coincide con la reserva"}

        if reserva.estado_pago != "Pagado":
            return {"status": "denied", "message": "La reserva no ha sido abonada"}

        now = datetime.datetime.now()
        is_entry = "ENTRADA" in data.gate_id.upper()
        
        if is_entry:
            if reserva.estado_reserva == "Activa":
                return {"status": "denied", "message": "El vehículo ya se encuentra dentro del predio"}
            if reserva.estado_reserva == "Completada":
                 return {"status": "denied", "message": "Esta reserva ya fue utilizada y completada"}
            
            aforo = db.query(models.ParkingAforo).first()
            if aforo.ocupacion_actual >= aforo.capacidad_total:
                return {"status": "denied", "message": "Capacidad máxima alcanzada"}

            aforo.ocupacion_actual += 1
            reserva.estado_reserva = "Activa"
            db.add(models.AccessLog(patente_detectada=patente, tipo_evento="ENTRADA", fecha_hora=now.isoformat(), reserva_id=reserva.id, pago_confirmado=True))
            db.commit()
            
            if request and hasattr(request.app, 'mqtt_client'):
                request.app.mqtt_client.publish(MQTT_TOPIC_ENTRADA, json.dumps({"command": "OPEN", "plate": patente, "method": "QR", "timestamp": now.isoformat()}))
                
            return {"status": "allowed", "action": "OPEN_GATE", "message": f"QR Válido. Bienvenido {patente}"}
        else:
            if reserva.estado_reserva != "Activa":
                return {"status": "error", "message": "No se registra un ingreso activo para esta reserva"}
                
            aforo = db.query(models.ParkingAforo).first()
            if aforo.ocupacion_actual > 0: aforo.ocupacion_actual -= 1
            reserva.estado_reserva = "Completada"
            db.add(models.AccessLog(patente_detectada=patente, tipo_evento="SALIDA", fecha_hora=now.isoformat(), reserva_id=reserva.id, pago_confirmado=True))
            db.commit()
            
            if request and hasattr(request.app, 'mqtt_client'):
                request.app.mqtt_client.publish(MQTT_TOPIC_SALIDA, json.dumps({"command": "OPEN", "plate": patente, "method": "QR", "timestamp": now.isoformat()}))
                
            return {"status": "allowed", "action": "OPEN_GATE", "message": f"QR Válido. Adiós {patente}"}
            
    except Exception as e:
        return {"status": "error", "message": f"Error procesando QR: {str(e)}"}

@router.post("/access/pay-stay")
def pay_stay(plate: str, db: Session = Depends(get_db)):
    """Procesa el pago de una estadía en curso utilizando el saldo del usuario."""
    result = BillingService.process_payment(db, normalize_plate(plate))
    if result["status"] == "ok": return result
    raise HTTPException(status_code=400, detail=result["message"])
