from sqlalchemy.orm import Session
from sqlalchemy import and_
import models

# --- REPOSITORIO DE RESERVAS (ACCESO A DATOS) ---

class ReservationRepository:
    @staticmethod
    def get_by_id(db: Session, res_id: int) -> models.Reservation:
        """Busca una reserva por su identificador único."""
        return db.query(models.Reservation).filter(models.Reservation.id == res_id).first()

    @staticmethod
    def get_by_user_and_id(db: Session, user_id: int, res_id: int) -> models.Reservation:
        """Busca una reserva específica vinculada a un usuario determinado."""
        return db.query(models.Reservation).filter(
            and_(models.Reservation.id == res_id, models.Reservation.user_id == user_id)
        ).first()

    @staticmethod
    def get_past_reservations(db: Session, user_id: int, now_str: str):
        """Obtiene las reservas vencidas que aún no han sido completadas."""
        return db.query(models.Reservation).filter(
            models.Reservation.user_id == user_id,
            models.Reservation.estado_reserva.in_(["Pendiente", "Activa"]),
            models.Reservation.fecha_fin < now_str
        ).all()

    @staticmethod
    def get_all_by_user(db: Session, user_id: int):
        """Retorna el historial completo de reservas de un usuario."""
        return db.query(models.Reservation).filter(
            models.Reservation.user_id == user_id
        ).order_by(models.Reservation.id.desc()).all()

    @staticmethod
    def save(db: Session, reservation: models.Reservation):
        """Persiste una nueva reserva o cambios en una existente."""
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        return reservation
