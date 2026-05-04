from database import SessionLocal
import models
import datetime

db = SessionLocal()

# 1. Crear un usuario de prueba
test_user = models.User(
    nombre="Juan Perez",
    email="juan@example.com",
    password_hash="hashed_password",
    puntos=100
)
db.add(test_user)
db.commit()
db.refresh(test_user)

# 2. Crear un vehículo vinculado
test_vehicle = models.Vehicle(
    user_id=test_user.id,
    patente="ABC1234", # Guardado normalizado
    marca_modelo="Toyota Corolla"
)
db.add(test_vehicle)

# 3. Crear una reserva activa para hoy
now = datetime.datetime.now()
start = now - datetime.timedelta(hours=1)
end = now + datetime.timedelta(hours=2)

test_reservation = models.Reservation(
    user_id=test_user.id,
    patente="ABC1234", # Guardado normalizado
    fecha_inicio=start.isoformat(),
    fecha_fin=end.isoformat(),
    monto_total=1500.0,
    estado_pago="Aprobado",
    estado_reserva="Pendiente"
)
db.add(test_reservation)

db.commit()
print("Datos de prueba cargados exitosamente.")
db.close()
