from database import SessionLocal
import models
import datetime

# --- SCRIPT DE GENERACIÓN DE DATOS DE PRUEBA (SEEDING) ---

def seed_test_data():
    """Inserta registros de ejemplo para validación de funcionalidades en desarrollo."""
    db = SessionLocal()
    try:
        # 1. Creación de usuario de prueba
        test_user = models.User(
            nombre="Juan Perez",
            email="juan@example.com",
            password_hash="hashed_password",
            puntos_acumulados=100,
            dni="12345678",
            telefono="1122334455"
        )
        db.add(test_user)
        db.commit()
        db.refresh(test_user)

        # 2. Vinculación de flota de prueba
        test_vehicle = models.Vehicle(
            user_id=test_user.id,
            patente="ABC 123",
            marca_modelo="Toyota Corolla"
        )
        db.add(test_vehicle)

        # 3. Creación de reserva programada
        now = datetime.datetime.now()
        start = now - datetime.timedelta(hours=1)
        end = now + datetime.timedelta(hours=2)

        test_reservation = models.Reservation(
            user_id=test_user.id,
            patente="ABC 123",
            fecha_inicio=start.isoformat(),
            fecha_fin=end.isoformat(),
            monto_total=1500.0,
            estado_pago="Pagado",
            estado_reserva="Activa",
            sucursal_nombre="AUTOPASS Central",
            tipo_estadia="hora"
        )
        db.add(test_reservation)

        db.commit()
        print("[OK] Datos de prueba cargados correctamente.")
    except Exception as e:
        print(f"❌ [ERROR] Falló la carga de datos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_test_data()
