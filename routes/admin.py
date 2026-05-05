from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, auth
from database import get_db

router = APIRouter(prefix="/v1", tags=["Admin & Settings"])

def get_admin_user(current_user: models.User = Depends(auth.get_current_user)):
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos de administrador")
    return current_user

@router.get("/admin/users")
def list_users(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    return db.query(models.User).all()

@router.get("/settings/prices")
def get_prices(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    return {p.clave: p.valor for p in db.query(models.Settings).all()}

@router.post("/settings/prices")
def update_price(clave: str, valor: float, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    setting = db.query(models.Settings).filter(models.Settings.clave == clave).first()
    if setting: setting.valor = valor
    else: db.add(models.Settings(clave=clave, valor=valor))
    db.commit()
    return {"status": "ok"}

@router.post("/admin/manual-entry")
def manual_entry(plate: str, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    import datetime, json, re
    from routes.parking import normalize_plate, MQTT_TOPIC_ENTRADA
    
    p = normalize_plate(plate)
    now = datetime.datetime.now()
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if ultimo and ultimo.tipo_evento == "ENTRADA":
        raise HTTPException(status_code=400, detail="El vehículo ya figura como ingresado")
    
    aforo = db.query(models.ParkingAforo).first()
    aforo.ocupacion_actual += 1
    db.add(models.AccessLog(patente_detectada=p, tipo_evento="ENTRADA", fecha_hora=now.isoformat()))
    db.commit()
    
    # Podríamos inyectar el cliente mqtt aquí también, o usar un evento
    return {"status": "ok", "message": f"Ingreso manual: {p}"}

@router.post("/admin/manual-exit")
def manual_exit(plate: str, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    import datetime
    from routes.parking import normalize_plate, MQTT_TOPIC_SALIDA
    
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
    
    return {"status": "ok", "message": f"Salida manual: {p}"}
