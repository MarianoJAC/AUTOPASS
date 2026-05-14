
import datetime
from sqlalchemy.orm import Session
import models
from services.billing_service import BillingService
from repositories.reservation_repository import ReservationRepository
from repositories.user_repository import UserRepository
from fastapi import HTTPException

class ReservationService:
    @staticmethod
    def auto_finalize_reservations(db: Session, user_id: int):
        """Finaliza automáticamente reservas pasadas del usuario."""
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        past_reservations = ReservationRepository.get_past_reservations(db, user_id, now_str)
        
        if past_reservations:
            for r in past_reservations:
                r.estado_reserva = "Completada"
            db.commit()

    @staticmethod
    def pay_reservation(db: Session, user: models.User, res_id: int):
        """Procesa el pago de una reserva usando el saldo del usuario."""
        res = ReservationRepository.get_by_user_and_id(db, user.id, res_id)
        
        if not res: 
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
        if res.estado_pago == "Pagado":
            return {"status": "ok", "message": "La reserva ya figura como pagada"}
        
        if user.saldo < res.monto_total:
            raise HTTPException(status_code=400, detail="Saldo insuficiente para pagar esta reserva")
        
        # Deducir saldo y marcar como pagado
        user.saldo -= res.monto_total
        res.estado_pago = "Pagado"
        
        # Acreditar puntos AutoPass
        puntos_ganados = BillingService.calculate_points(res.monto_total)
        user.puntos_acumulados += puntos_ganados
        
        # Registrar en historial de puntos (se podría crear PointsRepository luego)
        log_pts = models.PointsLog(
            user_id=user.id,
            cantidad=puntos_ganados,
            motivo=f"Reserva: {res.patente}",
            fecha=datetime.datetime.now().isoformat()
        )
        db.add(log_pts)
        db.commit()
        return {"status": "ok", "message": "Reserva pagada con éxito y puntos acreditados", "puntos_ganados": puntos_ganados}

    @staticmethod
    def cancel_reservation(db: Session, user: models.User, res_id: int):
        """Cancela una reserva y reembolsa el saldo si correspondiera."""
        res = ReservationRepository.get_by_user_and_id(db, user.id, res_id)
        
        if not res: 
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
        if res.estado_reserva == "Cancelada":
            return {"status": "ok", "message": "La reserva ya está cancelada"}
            
        # Reembolso si estaba pagada
        if res.estado_pago == "Pagado":
            user.saldo += res.monto_total
            
            # Deducir puntos otorgados
            puntos_a_descontar = BillingService.calculate_points(res.monto_total)
            user.puntos_acumulados -= puntos_a_descontar
            
            # Registrar el descuento en el historial
            log_pts = models.PointsLog(
                user_id=user.id,
                cantidad=-puntos_a_descontar,
                motivo=f"Cancelación Reserva: {res.patente}",
                fecha=datetime.datetime.now().isoformat()
            )
            db.add(log_pts)
            
        res.estado_reserva = "Cancelada"
        res.estado_pago = "Cancelado"
        db.commit()
        return {"status": "ok", "message": "Reserva cancelada, saldo reembolsado y puntos ajustados"}
