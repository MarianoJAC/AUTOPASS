from sqlalchemy.orm import Session
import models

# --- REPOSITORIO DE USUARIOS (ACCESO A DATOS) ---

class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> models.User:
        """Obtiene un usuario por su identificador único."""
        return db.query(models.User).filter(models.User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> models.User:
        """Busca un usuario por su dirección de correo electrónico."""
        return db.query(models.User).filter(models.User.email == email.lower().strip()).first()

    @staticmethod
    def update_balance(db: Session, user: models.User, amount: float):
        """Actualiza el saldo de la cuenta de un usuario."""
        user.saldo += amount
        db.commit()

    @staticmethod
    def add_points(db: Session, user: models.User, points: int):
        """Incrementa el puntaje acumulado de fidelización."""
        user.puntos_acumulados += points
        db.commit()
