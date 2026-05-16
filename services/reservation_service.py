import datetime
from sqlalchemy.orm import Session
import models
from services.billing_service import BillingService
from repositories.reservation_repository import ReservationRepository
from repositories.user_repository import UserRepository
from fastapi import HTTPException

# --- SERVICIO DE GESTIÓN DE RESERVAS ---

class ReservationService:
    @staticmethod
    def auto_finalize_reservations(db: Session, user_id: int):
        """Marca como completadas las reservas cuyo tiempo de estadía ya expiró."""
        now_str = datetime.datetime.now().strftime("%Y-%m-%d %H:%M")
        past_reservations = ReservationRepository.get_past_reservations(db, user_id, now_str)
        
        if past_reservations:
            for r in past_reservations:
                r.estado_reserva = "Completada"
            db.commit()

    @staticmethod
    def pay_reservation(db: Session, user: models.User, res_id: int):
        """Abona una reserva utilizando el saldo disponible del usuario."""
        res = ReservationRepository.get_by_user_and_id(db, user.id, res_id)
        
        if not res: 
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
        if res.estado_pago == "Pagado":
            return {"status": "ok", "message": "La reserva ya ha sido abonada"}
        
        if user.saldo < res.monto_total:
            raise HTTPException(status_code=400, detail="Saldo insuficiente en su cuenta AutoPass")
        
        # Deducción de saldo y actualización de estado
        user.saldo -= res.monto_total
        res.estado_pago = "Pagado"
        
        # Acreditación de puntos por lealtad
        puntos_ganados = BillingService.calculate_points(res.monto_total)
        user.puntos_acumulados += puntos_ganados
        
        db.add(models.PointsLog(
            user_id=user.id,
            cantidad=puntos_ganados,
            motivo=f"Reserva: {res.patente}",
            fecha=datetime.datetime.now().isoformat()
        ))
        
        db.commit()
        return {"status": "ok", "message": "Reserva abonada con éxito", "puntos_ganados": puntos_ganados}

    @staticmethod
    def cancel_reservation(db: Session, user: models.User, res_id: int):
        """Cancela una reserva activa y gestiona reembolsos si correspondiera."""
        res = ReservationRepository.get_by_user_and_id(db, user.id, res_id)
        
        if not res: 
            raise HTTPException(status_code=404, detail="Reserva no encontrada")
        
        if res.estado_reserva == "Cancelada":
            return {"status": "ok", "message": "La reserva ya se encuentra cancelada"}
            
        # Proceso de reembolso para reservas prepagas
        if res.estado_pago == "Pagado":
            user.saldo += res.monto_total
            
            # Ajuste de puntos acreditados
            puntos_a_descontar = BillingService.calculate_points(res.monto_total)
            user.puntos_acumulados -= puntos_a_descontar
            
            db.add(models.PointsLog(
                user_id=user.id,
                cantidad=-puntos_a_descontar,
                motivo=f"Cancelación de Reserva: {res.patente}",
                fecha=datetime.datetime.now().isoformat()
            ))
            
        res.estado_reserva = "Cancelada"
        res.estado_pago = "Cancelado"
        db.commit()
        return {"status": "ok", "message": "Reserva cancelada y saldo reembolsado"}
