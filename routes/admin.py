import datetime
import math
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/v1", tags=["Admin & Settings"])

def get_admin_user(current_user: models.User = Depends(auth.get_current_user)):
    """Dependencia para verificar si el usuario tiene rol de administrador."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos de administrador")
    return current_user

# --- GESTIÓN DE USUARIOS ---

@router.get("/admin/users")
def list_users(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Retorna la lista completa de usuarios registrados."""
    return db.query(models.User).all()

# --- GESTIÓN DE RESERVAS ---

@router.get("/admin/reservations", response_model=List[schemas.UserReservationResponse])
def list_reservations(sucursal: Optional[str] = Query(None), db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Lista todas las reservas del sistema con opción de filtrado por sucursal."""
    from services.reservation_service import ReservationService
    ReservationService.cleanup_overdue_reservations(db)
    
    q = db.query(models.Reservation)
    if sucursal:
        q = q.filter(models.Reservation.sucursal_nombre == sucursal)
    results = q.order_by(models.Reservation.id.desc()).all()
    
    out = []
    for r in results:
        d = schemas.UserReservationResponse.model_validate(r)
        if r.user:
            d.user_name = f"{r.user.nombre} {r.user.apellido}"
            d.user_email = r.user.email
        if r.cliente_nombre:
            d.user_name = r.cliente_nombre
        out.append(d)
    return out

@router.post("/admin/reservations")
def create_admin_reservation(data: schemas.AdminReservationCreate, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Permite al administrador crear una reserva manual para un usuario o cliente externo."""
    from services.billing_service import BillingService

    if data.user_id:
        user = db.query(models.User).filter(models.User.id == data.user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.patente == data.patente, models.Vehicle.user_id == data.user_id).first()
        if not vehicle:
            raise HTTPException(status_code=400, detail="La patente no está vinculada a ese usuario")

    start = datetime.datetime.fromisoformat(data.fecha_inicio)
    end = datetime.datetime.fromisoformat(data.fecha_fin)
    duration_hours = (end - start).total_seconds() / 3600
    if duration_hours <= 0:
        raise HTTPException(status_code=400, detail="La fecha de fin debe ser posterior a la de inicio")

    # Cálculo de tarifa según modalidad
    rate = BillingService.get_rate(db, data.tipo_estadia)
    if data.tipo_estadia == "hora":
        monto = math.ceil(duration_hours) * rate
    elif data.tipo_estadia == "dia":
        monto = max(1, math.ceil(duration_hours / 24)) * rate
    elif data.tipo_estadia == "semana":
        monto = math.ceil(duration_hours / (24 * 7)) * rate
    elif data.tipo_estadia == "quincena":
        monto = math.ceil(duration_hours / (24 * 15)) * rate
    elif data.tipo_estadia == "mes":
        monto = math.ceil(duration_hours / (24 * 30)) * rate
    else:
        monto = math.ceil(duration_hours) * rate

    sucursales_info = {
        "AUTOPASS Central": "Av. del Libertador 1200, CABA. Abierto 24hs.",
        "AUTOPASS Ituzaingó": "Punto de Acceso Estación Ituzaingó. Abierto 24hs.",
        "AUTOPASS Castelar": "Centro Comercial Castelar. Abierto 24hs.",
        "AUTOPASS Morón": "Plaza Oeste Shopping - Morón. Abierto 24hs."
    }
    info_sede = sucursales_info.get(data.sucursal_nombre, "Sede no especificada.")

    new_res = models.Reservation(
        user_id=data.user_id,
        patente=data.patente,
        fecha_inicio=data.fecha_inicio,
        fecha_fin=data.fecha_fin,
        monto_total=monto,
        estado_pago="Pendiente",
        estado_reserva="Pendiente",
        tipo_estadia=data.tipo_estadia,
        sucursal_nombre=data.sucursal_nombre,
        sucursal_info=info_sede,
        cliente_nombre=data.cliente_nombre
    )
    db.add(new_res)
    db.commit()
    return {"status": "ok", "id": new_res.id, "monto": monto}

@router.post("/admin/reservations/{res_id}/confirm-payment")
def confirm_reservation_payment(res_id: int, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Permite al administrador marcar una reserva como pagada manualmente."""
    reserva = db.query(models.Reservation).filter(models.Reservation.id == res_id).first()
    if not reserva:
        raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    reserva.estado_pago = "Pagado"
    db.commit()
    return {"status": "ok"}

# --- CONFIGURACIÓN DE TARIFAS ---

@router.get("/admin/settings")
def get_admin_settings(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Retorna todas las configuraciones globales vigentes."""
    all_settings = db.query(models.Settings).all()
    return {s.clave: s.valor for s in all_settings}

@router.post("/settings/prices")
def update_price(clave: str, valor: float, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Actualiza o crea un valor de configuración (Ej: precio por hora o capacidad total)."""
    if clave == "capacidad_total":
        aforo = db.query(models.ParkingAforo).first()
        if aforo:
            aforo.capacidad_total = int(valor)
            db.commit()
            return {"status": "ok"}
        else:
            db.add(models.ParkingAforo(capacidad_total=int(valor), ocupacion_actual=0, ultima_actualizacion=datetime.datetime.now().isoformat()))
            db.commit()
            return {"status": "ok"}

    setting = db.query(models.Settings).filter(models.Settings.clave == clave).first()
    if setting: setting.valor = valor
    else: db.add(models.Settings(clave=clave, valor=valor))
    db.commit()
    return {"status": "ok"}

# --- OPERACIONES MANUALES ---

@router.post("/admin/manual-entry")
def manual_entry(plate: str, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Registra un ingreso forzado de un vehículo al predio."""
    from routes.parking import normalize_plate
    p = normalize_plate(plate)
    now = datetime.datetime.now()
    
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if ultimo and ultimo.tipo_evento == "ENTRADA":
        raise HTTPException(status_code=400, detail="El vehículo ya figura como ingresado")
    
    aforo = db.query(models.ParkingAforo).first()
    aforo.ocupacion_actual += 1
    db.add(models.AccessLog(patente_detectada=p, tipo_evento="ENTRADA", fecha_hora=now.isoformat()))
    db.commit()
    return {"status": "ok", "message": f"Ingreso manual registrado: {p}"}

@router.post("/admin/manual-exit")
def manual_exit(plate: str, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Registra una salida manual. Requiere que la deuda esté previamente saldada."""
    from routes.parking import normalize_plate
    p = normalize_plate(plate)
    
    ultimo = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p).order_by(models.AccessLog.id.desc()).first()
    if not ultimo or ultimo.tipo_evento != "ENTRADA":
        raise HTTPException(status_code=400, detail="El vehículo no figura en el predio")
    if not ultimo.pago_confirmado:
        raise HTTPException(status_code=403, detail="DEUDA PENDIENTE. Debe procesar el cobro antes de permitir la salida.")
    
    aforo = db.query(models.ParkingAforo).first()
    if aforo.ocupacion_actual > 0: aforo.ocupacion_actual -= 1
    db.add(models.AccessLog(patente_detectada=p, tipo_evento="SALIDA", fecha_hora=datetime.datetime.now().isoformat(), pago_confirmado=True))
    db.commit()
    return {"status": "ok", "message": f"Salida manual registrada: {p}"}
