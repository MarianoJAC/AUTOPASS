
from sqlalchemy.orm import Session
import models

class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> models.User:
        return db.query(models.User).filter(models.User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> models.User:
        return db.query(models.User).filter(models.User.email == email.lower().strip()).first()

    @staticmethod
    def update_balance(db: Session, user: models.User, amount: float):
        user.saldo += amount
        db.commit()

    @staticmethod
    def add_points(db: Session, user: models.User, points: int):
        user.puntos_acumulados += points
        db.commit()
