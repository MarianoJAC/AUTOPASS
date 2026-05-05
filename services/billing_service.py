import datetime
from sqlalchemy.orm import Session
import models

class BillingService:
    @staticmethod
    def get_hourly_rate(db: Session) -> float:
        """Obtiene la tarifa por hora desde la configuración de la base de datos."""
        setting = db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first()
        return float(setting.valor) if setting else 100.0

    @staticmethod
    def calculate_debt(entry_time_str: str, db: Session) -> float:
        """Calcula la deuda acumulada basada en bloques de horas completas."""
        import math
        precio_hora = BillingService.get_hourly_rate(db)
        entrada_dt = datetime.datetime.fromisoformat(entry_time_str)
        
        # Diferencia de tiempo en horas
        delta = datetime.datetime.now() - entrada_dt
        horas_transcurridas = delta.total_seconds() / 3600
        
        # Se cobra por bloques de hora (si pasó 1 min de la hora, ya se cobra la siguiente)
        # Al menos se cobra 1 hora.
        bloques_a_cobrar = max(1, math.ceil(horas_transcurridas))
        monto = bloques_a_cobrar * precio_hora
        return float(monto)

    @staticmethod
    def calculate_points(amount: float) -> int:
        """Calcula los puntos AutoPass ganados (10 pts por cada $100)."""
        puntos = int(amount / 10) # Equivale a (monto / 100) * 10
        return max(1, puntos) if amount > 0 else 0

    @staticmethod
    def process_payment(db: Session, plate: str) -> dict:
        """Registra el pago de una estadía y acredita puntos al usuario."""
        # Buscamos el último ingreso sin pagar
        log = db.query(models.AccessLog).filter(
            models.AccessLog.patente_detectada == plate,
            models.AccessLog.tipo_evento == "ENTRADA",
            models.AccessLog.pago_confirmado == False
        ).order_by(models.AccessLog.id.desc()).first()

        if not log:
            return {"status": "error", "message": "No hay estadías pendientes para esta patente"}

        monto_real = BillingService.calculate_debt(log.fecha_hora, db)
        
        # Actualizar log
        log.pago_confirmado = True
        log.costo_estadia = monto_real
        
        # Acreditar puntos si el vehículo tiene dueño
        vehiculo = db.query(models.Vehicle).filter(models.Vehicle.patente == plate).first()
        puntos_ganados = 0
        if vehiculo and vehiculo.owner:
            puntos_ganados = BillingService.calculate_points(monto_real)
            vehiculo.owner.puntos_acumulados += puntos_ganados
        
        db.commit()
        return {
            "status": "ok", 
            "monto_cobrado": monto_real, 
            "puntos_ganados": puntos_ganados
        }
