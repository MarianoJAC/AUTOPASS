import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
import models, auth
from database import get_db

router = APIRouter(prefix="/v1/reports", tags=["Reports & Analytics"])

def get_admin_user(current_user: models.User = Depends(auth.get_current_user)):
    """Verifica permisos de administrador."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos de administrador")
    return current_user

# --- ANALÍTICA FINANCIERA ---

@router.get("/financial-summary")
def get_financial_summary(period: str = "total", start: str = None, end: str = None, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Calcula el resumen de recaudación para un periodo determinado."""
    q_base = db.query(func.sum(models.AccessLog.costo_estadia)).filter(models.AccessLog.pago_confirmado == True)
    q_count = db.query(models.AccessLog).filter(models.AccessLog.pago_confirmado == True, models.AccessLog.costo_estadia > 0)
    
    start_date = start
    end_date = end

    if period != "total" and not start:
        now = datetime.datetime.now()
        if period == "day":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        elif period == "week":
            start_date = (now - datetime.timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        elif period == "month":
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        elif period == "year":
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
    if start_date:
        q_base = q_base.filter(models.AccessLog.fecha_hora >= start_date)
        q_count = q_count.filter(models.AccessLog.fecha_hora >= start_date)
    if end_date:
        q_base = q_base.filter(models.AccessLog.fecha_hora <= end_date)
        q_count = q_count.filter(models.AccessLog.fecha_hora <= end_date)

    total = q_base.scalar() or 0.0
    cantidad = q_count.count()
    
    return {
        "total_recaudado": round(float(total), 2), 
        "cantidad_pagos": cantidad, 
        "ticket_promedio": round(float(total)/cantidad, 2) if cantidad > 0 else 0
    }

@router.get("/payment-history")
def get_payment_history(period: str = "total", start: str = None, end: str = None, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Lista el historial cronológico de transacciones confirmadas."""
    q = db.query(models.AccessLog).filter(models.AccessLog.pago_confirmado == True, models.AccessLog.costo_estadia > 0)
    
    start_date = start
    end_date = end

    if period != "total" and not start:
        now = datetime.datetime.now()
        if period == "day":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        elif period == "week":
            start_date = (now - datetime.timedelta(days=now.weekday())).replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        elif period == "month":
            start_date = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        elif period == "year":
            start_date = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
        
    if start_date: q = q.filter(models.AccessLog.fecha_hora >= start_date)
    if end_date: q = q.filter(models.AccessLog.fecha_hora <= end_date)

    return q.order_by(models.AccessLog.id.desc()).all()

# --- AUDITORÍA DE ACCESOS ---

@router.get("/access")
def get_reports_access(patente: str = None, db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Consulta el historial de eventos ALPR, con opción de búsqueda por patente."""
    q = db.query(models.AccessLog)
    if patente: q = q.filter(models.AccessLog.patente_detectada.like(f"%{patente.upper()}%"))
    return q.order_by(models.AccessLog.id.desc()).all()
