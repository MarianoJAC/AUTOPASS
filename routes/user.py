import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import models, schemas, auth
from database import get_db
from services.billing_service import BillingService

router = APIRouter(prefix="/v1/user", tags=["User Actions"])

@router.get("/me", response_model=schemas.UserBase)
def get_me(current_user: models.User = Depends(auth.get_current_user)):
    return current_user

@router.put("/me", response_model=schemas.UserBase)
def update_me(data: schemas.UserUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
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
    if not auth.verify_password(data.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    current_user.password_hash = auth.get_password_hash(data.new_password)
    db.commit()
    return {"status": "ok", "message": "Contraseña actualizada con éxito"}

@router.get("/vehicles")
def get_user_vehicles(db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    return db.query(models.Vehicle).filter(models.Vehicle.user_id == current_user.id).all()

@router.post("/vehicles")
def add_user_vehicle(patente: str, marca_modelo: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    import re
    from routes.parking import normalize_plate, format_plate, normalize_name
    
    p_clean = normalize_plate(patente)
    
    old_format = re.match(r'^[A-Z]{3}[0-9]{3}$', p_clean)
    new_format = re.match(r'^[A-Z]{2}[0-9]{3}[A-Z]{2}$', p_clean)
    
    if not old_format and not new_format:
        raise HTTPException(status_code=400, detail="Formato de patente inválido. Formatos válidos: ABC 123 o AB 123 CD")
    
    p_formatted = format_plate(patente)
    m_normalized = normalize_name(marca_modelo)
    
    existing = db.query(models.Vehicle).filter(func.replace(models.Vehicle.patente, ' ', '') == p_clean).first()
    if existing: raise HTTPException(status_code=400, detail="La patente ya está registrada")
    
    new_vehicle = models.Vehicle(user_id=current_user.id, patente=p_formatted, marca_modelo=m_normalized)
    db.add(new_vehicle)
    db.commit()
    return {"status": "ok"}

@router.delete("/vehicles/{patente}")
def delete_user_vehicle(patente: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    # Buscamos por la patente normalizada
    from routes.parking import normalize_plate
    p_clean = normalize_plate(patente)
    vehicle = db.query(models.Vehicle).filter(func.replace(models.Vehicle.patente, ' ', '') == p_clean, models.Vehicle.user_id == current_user.id).first()
    if not vehicle: raise HTTPException(status_code=404, detail="Vehículo no encontrado")
    
    db.delete(vehicle)
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
    return db.query(models.Reservation).filter(models.Reservation.user_id == current_user.id).order_by(models.Reservation.id.desc()).all()

@router.post("/reservations")
def create_user_reservation(res: schemas.UserReservationCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    vehicle = db.query(models.Vehicle).filter(models.Vehicle.patente == res.patente, models.Vehicle.user_id == current_user.id).first()
    if not vehicle: raise HTTPException(status_code=400, detail="Patente no vinculada a su cuenta")
    
    import math
    rate = BillingService.get_rate(db, res.tipo_estadia)

    if res.tipo_estadia == "dia" and res.dias_semana:
        start = datetime.datetime.fromisoformat(res.fecha_inicio)
        end = datetime.datetime.fromisoformat(res.fecha_fin)
        dias_seleccionados = [int(d.strip()) for d in res.dias_semana.split(",") if d.strip()]
        count = 0
        d = start
        while d <= end:
            if d.weekday() in dias_seleccionados:
                count += 1
            d += datetime.timedelta(days=1)
        if count == 0:
            raise HTTPException(status_code=400, detail="No hay días seleccionados dentro del rango")
        monto = count * rate
    else:
        start = datetime.datetime.fromisoformat(res.fecha_inicio)
        end = datetime.datetime.fromisoformat(res.fecha_fin)
        duration_hours = (end - start).total_seconds() / 3600

        if res.tipo_estadia == "hora":
            if duration_hours <= 0:
                raise HTTPException(status_code=400, detail="La fecha de fin debe ser posterior a la de inicio")
            monto = math.ceil(duration_hours) * rate
        elif res.tipo_estadia == "dia":
            monto = max(1, math.ceil(duration_hours / 24)) * rate
        else:
            if duration_hours <= 0:
                raise HTTPException(status_code=400, detail="La fecha de fin debe ser posterior a la de inicio")
            if res.tipo_estadia == "semana":
                monto = math.ceil(duration_hours / (24 * 7)) * rate
            elif res.tipo_estadia == "quincena":
                monto = math.ceil(duration_hours / (24 * 15)) * rate
            elif res.tipo_estadia == "mes":
                monto = math.ceil(duration_hours / (24 * 30)) * rate
            else:
                monto = math.ceil(duration_hours) * rate
    estado_pago = "Pendiente"
    if current_user.saldo >= monto:
        current_user.saldo -= monto
        estado_pago = "Pagado"
    
    # MAPEO DE SUCURSALES
    sucursales_info = {
        "AUTOPASS Central": "Av. del Libertador 1200, CABA. Abierto 24hs.",
        "AUTOPASS Ituzaingó": "Punto de Acceso Estación Ituzaingó. Abierto 24hs.",
        "AUTOPASS Castelar": "Centro Comercial Castelar. Abierto 24hs.",
        "AUTOPASS Morón": "Plaza Oeste Shopping - Morón. Abierto 24hs."
    }
    info_sede = sucursales_info.get(res.sucursal_nombre, "Sede no especificada.")

    new_res = models.Reservation(
        user_id=current_user.id, 
        patente=res.patente, 
        fecha_inicio=res.fecha_inicio, 
        fecha_fin=res.fecha_fin, 
        tipo_estadia=res.tipo_estadia,
        monto_total=monto, 
        estado_pago=estado_pago, 
        estado_reserva="Pendiente",
        sucursal_nombre=res.sucursal_nombre,
        sucursal_info=info_sede,
        dias_semana=res.dias_semana
    )
    db.add(new_res)
    db.commit()
    return {"status": "ok", "monto": monto, "estado_pago": estado_pago}

@router.patch("/reservations/{res_id}")
def modify_reservation(res_id: int, data: schemas.ReservationUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    res = db.query(models.Reservation).filter(models.Reservation.id == res_id, models.Reservation.user_id == current_user.id).first()
    if not res: raise HTTPException(status_code=404, detail="Reserva no encontrada")

    # Verificar límite de tiempo (2 horas antes)
    start_dt = datetime.datetime.fromisoformat(res.fecha_inicio)
    if (start_dt - datetime.datetime.now()).total_seconds() < 7200:
        raise HTTPException(status_code=400, detail="No se puede modificar una reserva con menos de 2 horas de antelación")

    # Guardar monto anterior para ajuste de saldo
    monto_anterior = res.monto_total
    ya_pagado = res.estado_pago == "Pagado"

    # Actualizar campos
    if data.fecha_inicio: res.fecha_inicio = data.fecha_inicio
    if data.fecha_fin: res.fecha_fin = data.fecha_fin
    if data.patente: 
        vehicle = db.query(models.Vehicle).filter(models.Vehicle.patente == data.patente, models.Vehicle.user_id == current_user.id).first()
        if not vehicle: raise HTTPException(status_code=400, detail="Patente no vinculada a su cuenta")
        res.patente = data.patente
    if data.tipo_estadia: res.tipo_estadia = data.tipo_estadia
    if data.sucursal_nombre:
        res.sucursal_nombre = data.sucursal_nombre
        sucursales_info = {
            "AUTOPASS Central": "Av. del Libertador 1200, CABA. Abierto 24hs.",
            "AUTOPASS Ituzaingó": "Punto de Acceso Estación Ituzaingó. Abierto 24hs.",
            "AUTOPASS Castelar": "Centro Comercial Castelar. Abierto 24hs.",
            "AUTOPASS Morón": "Plaza Oeste Shopping - Morón. Abierto 24hs."
        }
        res.sucursal_info = sucursales_info.get(data.sucursal_nombre, "Sede no especificada.")

    # RECALCULAR MONTO
    import math
    rate = BillingService.get_rate(db, res.tipo_estadia)
    start = datetime.datetime.fromisoformat(res.fecha_inicio)
    end = datetime.datetime.fromisoformat(res.fecha_fin)
    duration_hours = (end - start).total_seconds() / 3600

    if duration_hours <= 0:
        raise HTTPException(status_code=400, detail="La fecha de fin debe ser posterior a la de inicio")

    if res.tipo_estadia == "hora":
        monto_nuevo = math.ceil(duration_hours) * rate
    elif res.tipo_estadia == "dia":
        monto_nuevo = max(1, math.ceil(duration_hours / 24)) * rate
    elif res.tipo_estadia == "semana":
        monto_nuevo = math.ceil(duration_hours / (24 * 7)) * rate
    elif res.tipo_estadia == "quincena":
        monto_nuevo = math.ceil(duration_hours / (24 * 15)) * rate
    elif res.tipo_estadia == "mes":
        monto_nuevo = math.ceil(duration_hours / (24 * 30)) * rate
    else:
        monto_nuevo = math.ceil(duration_hours) * rate

    # AJUSTE DE SALDO SI YA ESTABA PAGADO
    if ya_pagado:
        diferencia = monto_nuevo - monto_anterior
        if diferencia > 0:
            # Debe pagar más
            if current_user.saldo < diferencia:
                raise HTTPException(status_code=400, detail=f"Saldo insuficiente para la modificación. Necesitás ${diferencia} adicionales.")
            current_user.saldo -= diferencia
        elif diferencia < 0:
            # Reembolso parcial
            current_user.saldo += abs(diferencia)
    else:
        # Si no estaba pagado, intentamos cobrar el nuevo monto si el saldo alcanza
        if current_user.saldo >= monto_nuevo:
            current_user.saldo -= monto_nuevo
            res.estado_pago = "Pagado"

    res.monto_total = monto_nuevo
    db.commit()
    return {"status": "ok", "monto_total": monto_nuevo, "estado_pago": res.estado_pago}

@router.post("/reservations/{res_id}/pay")
def pay_reservation(res_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    res = db.query(models.Reservation).filter(models.Reservation.id == res_id, models.Reservation.user_id == current_user.id).first()
    if not res: raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if res.estado_pago == "Pagado":
        return {"status": "ok", "message": "La reserva ya figura como pagada"}
    
    res.estado_pago = "Pagado"
    db.commit()
    return {"status": "ok", "message": "Reserva marcada como pagada con éxito"}


@router.post("/reservations/{res_id}/cancel")
def cancel_reservation(res_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    res = db.query(models.Reservation).filter(models.Reservation.id == res_id, models.Reservation.user_id == current_user.id).first()
    if not res: raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    if res.estado_reserva == "Cancelada":
        raise HTTPException(status_code=400, detail="La reserva ya está cancelada")
    
    res.estado_reserva = "Cancelada"
    db.commit()
    return {"status": "ok", "message": "Reserva cancelada"}

@router.post("/reservations/{res_id}/repeat")
def repeat_reservation(res_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    old_res = db.query(models.Reservation).filter(models.Reservation.id == res_id, models.Reservation.user_id == current_user.id).first()
    if not old_res: raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    return {
        "status": "ok",
        "data": {
            "patente": old_res.patente,
            "sucursal_nombre": old_res.sucursal_nombre,
            "sucursal_info": old_res.sucursal_info
        }
    }

@router.post("/reservations/{res_id}/complain")
def complain_reservation(res_id: int, message: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_user)):
    res = db.query(models.Reservation).filter(models.Reservation.id == res_id, models.Reservation.user_id == current_user.id).first()
    if not res: raise HTTPException(status_code=404, detail="Reserva no encontrada")
    
    # Simulación de envío de mail
    print(f"RECLAMO RECIBIDO para reserva {res_id} de {current_user.email}: {message}")
    return {"status": "ok", "message": "Su reclamo ha sido enviado al administrador del estacionamiento"}
