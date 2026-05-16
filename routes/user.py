import datetime
import math
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import models, schemas, auth
from database import get_db
from services.billing_service import BillingService
from services.reservation_service import ReservationService

router = APIRouter(prefix="/v1/user", tags=["User Actions"])

# --- PERFIL DE USUARIO ---

@router.get("/me", response_model=schemas.UserBase)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    """Retorna la información del perfil del usuario autenticado."""
    return current_user

@router.put("/me", response_model=schemas.UserBase)
def update_me(data: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Actualiza los datos personales del usuario."""
    from routes.parking import normalize_name
    if data.nombre: current_user.nombre = normalize_name(data.nombre)
    if data.apellido: current_user.apellido = normalize_name(data.apellido)
    if data.telefono: current_user.telefono = data.telefono
    if data.email: current_user.email = data.email.lower().strip()
    if data.direccion: current_user.direccion = data.direccion
    db.commit()
    db.refresh(current_user)
    return current_user

@router.post("/change-password")
def change_password(data: schemas.ChangePassword, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Procesa el cambio de contraseña validando la anterior."""
    if not auth.verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual ingresada es incorrecta")
    current_user.password_hash = auth.get_password_hash(data.new_password)
    db.commit()
    return {"status": "ok", "message": "Contraseña actualizada exitosamente"}

# --- GESTIÓN DE FLOTA (VEHÍCULOS) ---

@router.get("/vehicles")
def get_user_vehicles(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Lista todos los vehículos vinculados a la cuenta."""
    return db.query(models.Vehicle).filter(models.Vehicle.user_id == current_user.id).all()

@router.post("/vehicles")
def add_user_vehicle(patente: str, marca_modelo: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Vincula un nuevo vehículo validando el formato de patente argentina/mercosur."""
    import re
    from routes.parking import normalize_plate, format_plate, normalize_name
    
    p_clean = normalize_plate(patente)
    old_format = re.match(r'^[A-Z]{3}[0-9]{3}$', p_clean)
    new_format = re.match(r'^[A-Z]{2}[0-9]{3}[A-Z]{2}$', p_clean)
    
    if not old_format and not new_format:
        raise HTTPException(status_code=400, detail="Formato de patente inválido. Formatos permitidos: ABC 123 o AB 123 CD")
    
    existing = db.query(models.Vehicle).filter(func.replace(models.Vehicle.patente, ' ', '') == p_clean).first()
    if existing: raise HTTPException(status_code=400, detail="Esta patente ya se encuentra registrada en el sistema")
    
    new_vehicle = models.Vehicle(user_id=current_user.id, patente=format_plate(patente), marca_modelo=normalize_name(marca_modelo))
    db.add(new_vehicle)
    db.commit()
    return {"status": "ok"}

@router.delete("/vehicles/{patente}")
def delete_user_vehicle(patente: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Desvincula un vehículo de la cuenta del usuario."""
    from routes.parking import normalize_plate
    p_clean = normalize_plate(patente)
    vehicle = db.query(models.Vehicle).filter(func.replace(models.Vehicle.patente, ' ', '') == p_clean, models.Vehicle.user_id == current_user.id).first()
    if not vehicle: raise HTTPException(status_code=404, detail="Vehículo no encontrado en su flota")
    
    db.delete(vehicle)
    db.commit()
    return {"status": "ok"}

# --- MOVIMIENTOS Y PAGOS ---

@router.get("/active-stays")
def get_user_active_stays(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Lista las estadías actuales (dentro del predio) para los vehículos del usuario."""
    user_plates = [v.patente for v in current_user.vehicles]
    res = []
    for p in user_plates:
        ultimo_ingreso = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p, models.AccessLog.tipo_evento == "ENTRADA").order_by(models.AccessLog.id.desc()).first()
        if ultimo_ingreso:
            tiene_salida = db.query(models.AccessLog).filter(models.AccessLog.patente_detectada == p, models.AccessLog.tipo_evento == "SALIDA", models.AccessLog.fecha_hora > ultimo_ingreso.fecha_hora).first()
            if not tiene_salida:
                deuda = 0.0 if ultimo_ingreso.pago_confirmado else BillingService.calculate_debt(ultimo_ingreso.fecha_hora, db)
                res.append({"patente": p, "ingreso": ultimo_ingreso.fecha_hora, "deuda": deuda, "pago_confirmado": ultimo_ingreso.pago_confirmado})
    return res

@router.get("/payment-history")
def get_user_payment_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Historial cronológico de pagos realizados por el usuario."""
    user_plates = [v.patente for v in current_user.vehicles]
    return db.query(models.AccessLog).filter(
        models.AccessLog.patente_detectada.in_(user_plates),
        models.AccessLog.pago_confirmado == True,
        models.AccessLog.costo_estadia > 0
    ).order_by(models.AccessLog.id.desc()).all()

# --- GESTIÓN DE RESERVAS ---

@router.get("/reservations", response_model=List[schemas.UserReservationResponse])
def get_user_reservations(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Lista todas las reservas del usuario, actualizando estados automáticamente."""
    ReservationService.auto_finalize_reservations(db, current_user.id)
    return db.query(models.Reservation).filter(models.Reservation.user_id == current_user.id).order_by(models.Reservation.id.desc()).all()

@router.post("/reservations")
def create_user_reservation(res: schemas.UserReservationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Crea una nueva reserva y procesa el cobro si el saldo es suficiente."""
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.patente == res.patente, models.Vehicle.user_id == current_user.id).first()
    if not vehicle: raise HTTPException(status_code=400, detail="La patente no está vinculada a su cuenta")
    
    rate = BillingService.get_rate(db, res.tipo_estadia)
    start = datetime.datetime.fromisoformat(res.fecha_inicio)
    end = datetime.datetime.fromisoformat(res.fecha_fin)
    duration_hours = (end - start).total_seconds() / 3600

    if duration_hours <= 0:
        raise HTTPException(status_code=400, detail="La fecha de fin debe ser posterior a la de inicio")

    # Lógica de cálculo por modalidad
    if res.tipo_estadia == "dia" and res.dias_semana:
        dias_seleccionados = [int(d.strip()) for d in res.dias_semana.split(",") if d.strip()]
        count, d = 0, start
        while d <= end:
            if d.weekday() in dias_seleccionados: count += 1
            d += datetime.timedelta(days=1)
        if count == 0: raise HTTPException(status_code=400, detail="No hay días seleccionados dentro del rango")
        monto = count * rate
    elif res.tipo_estadia == "hora":
        monto = math.ceil(duration_hours) * rate
    elif res.tipo_estadia == "dia":
        monto = max(1, math.ceil(duration_hours / 24)) * rate
    elif res.tipo_estadia == "semana":
        monto = math.ceil(duration_hours / (24 * 7)) * rate
    elif res.tipo_estadia == "quincena":
        monto = math.ceil(duration_hours / (24 * 15)) * rate
    elif res.tipo_estadia == "mes":
        monto = math.ceil(duration_hours / (24 * 30)) * rate
    else:
        monto = math.ceil(duration_hours) * rate

    # Proceso de pago automático con saldo
    estado_pago = "Pendiente"
    if current_user.saldo >= monto:
        current_user.saldo -= monto
        estado_pago = "Pagado"
        puntos_ganados = BillingService.calculate_points(monto)
        current_user.puntos_acumulados += puntos_ganados
        db.add(models.PointsLog(user_id=current_user.id, cantidad=puntos_ganados, motivo=f"Reserva: {res.patente}", fecha=datetime.datetime.now().isoformat()))
    
    sucursales_info = {
        "AUTOPASS Central": "Av. del Libertador 1200, CABA. Abierto 24hs.",
        "AUTOPASS Ituzaingó": "Punto de Acceso Estación Ituzaingó. Abierto 24hs.",
        "AUTOPASS Castelar": "Centro Comercial Castelar. Abierto 24hs.",
        "AUTOPASS Morón": "Plaza Oeste Shopping - Morón. Abierto 24hs."
    }
    
    new_res = models.Reservation(
        user_id=current_user.id, patente=res.patente, fecha_inicio=res.fecha_inicio, fecha_fin=res.fecha_fin, 
        tipo_estadia=res.tipo_estadia, monto_total=monto, estado_pago=estado_pago, estado_reserva="Pendiente",
        sucursal_nombre=res.sucursal_nombre, sucursal_info=sucursales_info.get(res.sucursal_nombre, "Sede no especificada."),
        dias_semana=res.dias_semana
    )
    db.add(new_res)
    db.commit()
    return {"status": "ok", "monto": monto, "estado_pago": estado_pago}

@router.patch("/reservations/{res_id}")
def modify_reservation(res_id: int, data: schemas.ReservationUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Permite modificar una reserva existente ajustando saldo y puntos si corresponde."""
    res = db.query(models.Reservation).filter(models.Reservation.id == res_id, models.Reservation.user_id == current_user.id).first()
    if not res: raise HTTPException(status_code=404, detail="Reserva no encontrada")

    if (datetime.datetime.fromisoformat(res.fecha_inicio) - datetime.datetime.now()).total_seconds() < 7200:
        raise HTTPException(status_code=400, detail="No se puede modificar con menos de 2 horas de antelación")

    monto_anterior, ya_pagado = res.monto_total, res.estado_pago == "Pagado"

    if data.fecha_inicio: res.fecha_inicio = data.fecha_inicio
    if data.fecha_fin: res.fecha_fin = data.fecha_fin
    if data.patente: 
        if not db.query(models.Vehicle).filter(models.Vehicle.patente == data.patente, models.Vehicle.user_id == current_user.id).first():
            raise HTTPException(status_code=400, detail="Patente no vinculada")
        res.patente = data.patente
    if data.tipo_estadia: res.tipo_estadia = data.tipo_estadia
    if data.sucursal_nombre: res.sucursal_nombre = data.sucursal_nombre

    # Recalcular monto
    rate = BillingService.get_rate(db, res.tipo_estadia)
    duration_hours = (datetime.datetime.fromisoformat(res.fecha_fin) - datetime.datetime.fromisoformat(res.fecha_inicio)).total_seconds() / 3600
    if duration_hours <= 0: raise HTTPException(status_code=400, detail="Fechas inválidas")

    monto_nuevo = math.ceil(duration_hours) * rate # Simplificado para el patch
    if res.tipo_estadia == "dia": monto_nuevo = max(1, math.ceil(duration_hours / 24)) * rate
    elif res.tipo_estadia == "semana": monto_nuevo = math.ceil(duration_hours / (24 * 7)) * rate
    elif res.tipo_estadia == "quincena": monto_nuevo = math.ceil(duration_hours / (24 * 15)) * rate
    elif res.tipo_estadia == "mes": monto_nuevo = math.ceil(duration_hours / (24 * 30)) * rate

    if ya_pagado:
        diferencia = monto_nuevo - monto_anterior
        dif_puntos = BillingService.calculate_points(monto_nuevo) - BillingService.calculate_points(monto_anterior)
        if dif_puntos != 0:
            current_user.puntos_acumulados += dif_puntos
            db.add(models.PointsLog(user_id=current_user.id, cantidad=dif_puntos, motivo=f"Ajuste Reserva: {res.patente}", fecha=datetime.datetime.now().isoformat()))
        if diferencia > 0:
            if current_user.saldo < diferencia: raise HTTPException(status_code=400, detail=f"Saldo insuficiente (+${diferencia})")
            current_user.saldo -= diferencia
        else: current_user.saldo += abs(diferencia)
    else:
        if current_user.saldo >= monto_nuevo:
            current_user.saldo -= monto_nuevo
            res.estado_pago = "Pagado"
            puntos = BillingService.calculate_points(monto_nuevo)
            current_user.puntos_acumulados += puntos
            db.add(models.PointsLog(user_id=current_user.id, cantidad=puntos, motivo=f"Reserva: {res.patente}", fecha=datetime.datetime.now().isoformat()))

    res.monto_total = monto_nuevo
    db.commit()
    return {"status": "ok", "monto_total": monto_nuevo, "estado_pago": res.estado_pago}

@router.post("/reservations/{res_id}/pay")
def pay_reservation(res_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Abona una reserva pendiente con el saldo de la cuenta."""
    return ReservationService.pay_reservation(db, current_user, res_id)

@router.post("/reservations/{res_id}/cancel")
def cancel_reservation(res_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Cancela una reserva y reembolsa el monto si ya fue pagada."""
    return ReservationService.cancel_reservation(db, current_user, res_id)

# --- PUNTOS Y FIDELIZACIÓN ---

@router.get("/promotions", response_model=List[schemas.PromotionResponse])
def get_promotions(db: Session = Depends(get_db)):
    """Lista las promociones y beneficios vigentes."""
    return db.query(models.Promotion).filter(models.Promotion.activa == True).all()

@router.post("/redeem/{promo_id}")
def redeem_points(promo_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Procesa el canje de puntos por un beneficio del catálogo."""
    promo = db.query(models.Promotion).filter(models.Promotion.id == promo_id, models.Promotion.activa == True).first()
    if not promo: raise HTTPException(status_code=404, detail="Promoción no encontrada")
    if current_user.puntos_acumulados < promo.costo_puntos: raise HTTPException(status_code=400, detail="Puntos insuficientes")
    
    current_user.puntos_acumulados -= promo.costo_puntos
    db.add(models.PointsLog(user_id=current_user.id, cantidad=-promo.costo_puntos, motivo=f"Canje: {promo.titulo}", fecha=datetime.datetime.now().isoformat()))
    db.commit()
    return {"status": "ok", "message": f"Canje exitoso: {promo.titulo}"}

@router.get("/points-history")
def get_points_history(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Retorna el historial completo de movimientos de puntos del usuario."""
    return db.query(models.PointsLog).filter(models.PointsLog.user_id == current_user.id).order_by(models.PointsLog.id.desc()).all()

@router.post("/recharge-balance")
def recharge_balance(data: schemas.RechargeBalance, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    """Simula la carga de saldo en la cuenta del usuario."""
    if data.monto <= 0: raise HTTPException(status_code=400, detail="Monto inválido")
    current_user.saldo += data.monto
    db.commit()
    return {"status": "ok", "message": f"Carga de ${data.monto:.2f} exitosa"}
