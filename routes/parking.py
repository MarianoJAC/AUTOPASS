import datetime
import json
import re
import os
import base64
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, schemas, auth
from database import get_db
from typing import List
from dotenv import load_dotenv

# Importamos el Servicio
from services.billing_service import BillingService

load_dotenv()

router = APIRouter(prefix="/v1", tags=["Parking & Access"])

MQTT_TOPIC_ENTRADA = os.getenv("MQTT_TOPIC_ENTRADA", "parking/barrera/entrada/control")
MQTT_TOPIC_SALIDA = os.getenv("MQTT_TOPIC_SALIDA", "parking/barrera/salida/control")
IMAGE_DIR = os.getenv("IMAGE_DIR", "captured_images")

def normalize_plate(p: str): 
    return re.sub(r'[^A-Z0-9]', '', p.upper())

def format_plate(p: str):
    clean = normalize_plate(p)
    if len(clean) == 6: # Formato ABC123
        return f"{clean[:3]} {clean[3:]}"
    if len(clean) == 7: # Formato AB123CD
        return f"{clean[:2]} {clean[2:5]} {clean[5:]}"
    return clean

def normalize_name(s: str):
    return s.strip().title()

def normalize_dni(s: str):
    clean = re.sub(r'[^0-9]', '', s)
    if len(clean) < 7: return clean
    # Formatear con puntos (ej: 12.345.678 o 1.234.567)
    if len(clean) == 7:
        return f"{clean[0]}.{clean[1:4]}.{clean[4:]}"
    if len(clean) == 8:
        return f"{clean[:2]}.{clean[2:5]}.{clean[5:]}"
    return clean

@router.get("/parking/status", response_model=schemas.ParkingStatus)
def get_parking_status(db: Session = Depends(get_db)):
    a = db.query(models.ParkingAforo).first()
    if not a:
        return {"capacidad_total": 20, "ocupacion_actual": 0, "disponibilidad": 20}
    return {"capacidad_total": a.capacidad_total, "ocupacion_actual": a.ocupacion_actual, "disponibilidad": a.capacidad_total - a.ocupacion_actual}

@router.get("/parking/current-occupancy")
def current_occupancy(db: Session = Depends(get_db)):
    entradas = db.query(models.AccessLog).filter(models.AccessLog.tipo_evento == "ENTRADA").all()
    res = []
    for e in entradas:
        tiene_salida = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == e.patente_detectada, models.AccessLog.tipo_evento == "SALIDA", models.AccessLog.fecha_hora > e.fecha_hora).first()
        if not tiene_salida:
            # USAMOS EL SERVICIO
            deuda = 0.0 if e.pago_confirmado else BillingService.calculate_debt(e.fecha_hora, db)
            res.append({"patente": e.patente_detectada, "ingreso": e.fecha_hora, "deuda": deuda, "ya_pago": e.pago_confirmado, "es_reserva": e.reserva_id is not None})
    return res

@router.post("/access/validate-plate", response_model=schemas.AccessResponse)
def validate_plate(data: schemas.PlateValidation, db: Session = Depends(get_db), request: Request = None):
    p = normalize_plate(data.plate)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if ultimo and ultimo.tipo_evento == "ENTRADA": 
        return {"status": "denied", "message": "Ya está dentro"}
    
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
        db.add(models.AccessLog(patente_detectada=p, tipo_evento="ENTRADA", fecha_hora=now.isoformat(), imagen_path=img_name, reserva_id=reserva.id if reserva else None))
        db.commit()
        
        if request and hasattr(request.app, 'mqtt_client'):
            request.app.mqtt_client.publish(MQTT_TOPIC_ENTRADA, json.dumps({"command": "OPEN", "plate": p, "timestamp": now.isoformat()}))
            
        return {"status": "allowed", "action": "OPEN_GATE", "message": f"Bienvenido {p}"}
    return {"status": "denied", "message": "Lleno"}

@router.post("/access/exit-plate", response_model=schemas.AccessResponse)
def exit_plate(data: schemas.PlateValidation, db: Session = Depends(get_db), request: Request = None):
    p = normalize_plate(data.plate)
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if not ultimo or ultimo.tipo_evento != "ENTRADA": 
        return {"status": "error", "message": "No registrado"}
    
    if not (ultimo.pago_confirmado or (ultimo.reservation and ultimo.reservation.estado_pago == "Pagado")):
        return {"status": "denied", "message": "Deuda pendiente"}
        
    aforo = db.query(models.ParkingAforo).first()
    if aforo.ocupacion_actual > 0: 
        aforo.ocupacion_actual -= 1
        
    now = datetime.datetime.now()
    db.add(models.AccessLog(patente_detectada=p, tipo_evento="SALIDA", fecha_hora=now.isoformat(), pago_confirmado=True))
    db.commit()
    
    if request and hasattr(request.app, 'mqtt_client'):
        request.app.mqtt_client.publish(MQTT_TOPIC_SALIDA, json.dumps({"command": "OPEN", "plate": p, "timestamp": now.isoformat()}))
        
    return {"status": "allowed", "action": "OPEN_GATE", "message": f"Adiós {p}"}

@router.post("/access/pay-stay")
def pay_stay(plate: str, db: Session = Depends(get_db)):
    # USAMOS EL SERVICIO PARA TODO EL PROCESO DE COBRO Y PUNTOS
    result = BillingService.process_payment(db, normalize_plate(plate))
    if result["status"] == "ok":
        return result
    raise HTTPException(status_code=400, detail=result["message"])
