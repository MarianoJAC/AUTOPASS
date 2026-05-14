
from sqlalchemy.orm import Session
from sqlalchemy import and_
import models

class ReservationRepository:
    @staticmethod
    def get_by_id(db: Session, res_id: int) -> models.Reservation:
        return db.query(models.Reservation).filter(models.Reservation.id == res_id).first()

    @staticmethod
    def get_by_user_and_id(db: Session, user_id: int, res_id: int) -> models.Reservation:
        return db.query(models.Reservation).filter(
            and_(models.Reservation.id == res_id, models.Reservation.user_id == user_id)
        ).first()

    @staticmethod
    def get_past_reservations(db: Session, user_id: int, now_str: str):
        return db.query(models.Reservation).filter(
            models.Reservation.user_id == user_id,
            models.Reservation.estado_reserva.in_(["Pendiente", "Activa"]),
            models.Reservation.fecha_fin < now_str
        ).all()

    @staticmethod
    def get_all_by_user(db: Session, user_id: int):
        return db.query(models.Reservation).filter(
            models.Reservation.user_id == user_id
        ).order_by(models.Reservation.id.desc()).all()

    @staticmethod
    def save(db: Session, reservation: models.Reservation):
        db.add(reservation)
        db.commit()
        db.refresh(reservation)
        return reservation
