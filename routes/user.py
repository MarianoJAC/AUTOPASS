import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import models, schemas, auth
from database import get_db
from services.billing_service import BillingService

router = APIRouter(prefix="/v1/user", tags=["User Actions"])

@router.get("/me", response_model=schemas.UserBase)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.get("/vehicles")
def get_user_vehicles(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Vehicle).filter(models.Vehicle.user_id == current_user.id).all()

@router.post("/vehicles")
def add_user_vehicle(patente: str, marca_modelo: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    from routes.parking import normalize_plate
    p = normalize_plate(patente)
    existing = db.query(models.Vehicle).filter(models.Vehicle.patente == p).first()
    if existing: raise HTTPException(status_code=400, detail="La patente ya está registrada")
    new_vehicle = models.Vehicle(user_id=current_user.id, patente=p, marca_modelo=marca_modelo)
    db.add(new_vehicle)
    db.commit()
    return {"status": "ok"}

@router.get("/active-stays")
def get_user_active_stays(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    user_plates = [v.patente for v in current_user.vehicles]
    res = []
    for p in user_plates:
        ultimo_ingreso = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p, models.AccessLog.tipo_evento == "ENTRADA").order_by(models.AccessLog.id.desc()).first()
        if ultimo_ingreso:
            tiene_salida = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p, models.AccessLog.tipo_evento == "SALIDA", models.AccessLog.fecha_hora > ultimo_ingreso.fecha_hora).first()
            if not tiene_salida:
                # USAMOS EL SERVICIO
                deuda = 0.0 if ultimo_ingreso.pago_confirmado else BillingService.calculate_debt(ultimo_ingreso.fecha_hora, db)
                res.append({"patente": p, "ingreso": ultimo_ingreso.fecha_hora, "deuda": deuda, "pago_confirmado": ultimo_ingreso.pago_confirmado})
    return res

@router.get("/payment-history")
def get_user_payment_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    user_plates = [v.patente for v in current_user.vehicles]
    return db.query(models.AccessLog).filter(
        models.AccessLog.patente_detectada.in_(user_plates),
        models.AccessLog.pago_confirmado == True,
        models.AccessLog.costo_estadia > 0
    ).order_by(models.AccessLog.id.desc()).all()

@router.get("/reservations", response_model=List[schemas.UserReservationResponse])
def get_user_reservations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Reservation).filter(models.Reservation.user_id == current_user.id).all()

@router.post("/reservations")
def create_user_reservation(res: schemas.UserReservationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.patente == res.patente, models.Vehicle.user_id == current_user.id).first()
    if not vehicle: raise HTTPException(status_code=400, detail="Patente no vinculada a su cuenta")
    
    start = datetime.datetime.fromisoformat(res.fecha_inicio)
    end = datetime.datetime.fromisoformat(res.fecha_fin)
    duration_hours = (end - start).total_seconds() / 3600
    
    # USAMOS EL SERVICIO PARA LA TARIFA
    precio_hora = BillingService.get_hourly_rate(db)
    monto = max(precio_hora, round(duration_hours * precio_hora, 2))
    
    new_res = models.Reservation(user_id=current_user.id, patente=res.patente, fecha_inicio=res.fecha_inicio, fecha_fin=res.fecha_fin, monto_total=monto, estado_pago="Pendiente", estado_reserva="Pendiente")
    db.add(new_res)
    db.commit()
    return {"status": "ok", "monto": monto}
