import pytest
from fastapi.testclient import TestClient
from main import app
import uuid
import time

client = TestClient(app)

def test_complete_user_flow():
    # 1. Registro de Usuario
    numeric_id = str(time.time_ns())[-8:]
    test_id = str(uuid.uuid4())[:8]
    email = f"test_{test_id}@example.com"
    password = "TestPassword123!"
    
    register_payload = {
        "nombre": "Test",
        "apellido": "User",
        "dni": numeric_id, # El DNI debe contener únicamente números
        "telefono": "1122334455",
        "email": email,
        "password": password
    }
    
    response = client.post("/v1/auth/register", json=register_payload)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    # 2. Login
    login_payload = {
        "email": email,
        "password": password
    }
    response = client.post("/v1/auth/login", json=login_payload)
    assert response.status_code == 200
    token = response.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Verificar Perfil
    response = client.get("/v1/user/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == email

    # 4. Registrar Vehículo
    import random
    random_digits = "".join([str(random.randint(0, 9)) for _ in range(3)])
    patente = f"TST{random_digits}" # Formato AAA123 (6 chars)
    response = client.post(f"/v1/user/vehicles?patente={patente}&marca_modelo=TestModel", headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

    # Verificamos que el vehículo esté en la lista y obtenemos la patente formateada
    response = client.get("/v1/user/vehicles", headers=headers)
    vehicles = response.json()
    db_patente = next(v["patente"] for v in vehicles if v["patente"].replace(" ", "") == patente)

    # 5. Cargar Saldo (necesario para reservar y que se marque como Pagado)
    recharge_payload = {"monto": 5000.0}
    response = client.post("/v1/user/recharge-balance", json=recharge_payload, headers=headers)
    assert response.status_code == 200
    
    # 6. Crear Reserva
    # Calculamos fechas para mañana
    from datetime import datetime, timedelta
    now = datetime.now()
    inicio = (now + timedelta(days=1)).replace(hour=10, minute=0, second=0, microsecond=0).isoformat()
    fin = (now + timedelta(days=1, hours=2)).replace(hour=12, minute=0, second=0, microsecond=0).isoformat()

    reservation_payload = {
        "patente": db_patente, 
        "fecha_inicio": inicio,
        "fecha_fin": fin,
        "sucursal_nombre": "AUTOPASS Ituzaingó",
        "tipo_estadia": "hora"
    }
    
    response = client.post("/v1/user/reservations", json=reservation_payload, headers=headers)
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["estado_pago"] == "Pagado"
    monto_reserva = response.json()["monto"]

    # Verificar que se sumaron puntos (10 pts por cada $1000)
    response = client.get("/v1/user/me", headers=headers)
    expected_points = int(monto_reserva / 100) # 10 pts x $1000 = monto/100
    assert response.json()["puntos_acumulados"] >= expected_points

    # 7. Verificar Historial de Puntos
    response = client.get("/v1/user/points-history", headers=headers)
    assert response.status_code == 200
    assert any(p["cantidad"] > 0 for p in response.json())
    response = client.get("/v1/user/reservations", headers=headers)
    assert response.status_code == 200
    reservations = response.json()
    assert len(reservations) > 0
    res_id = reservations[0]["id"]

    # 8. Cancelar Reserva
    response = client.post(f"/v1/user/reservations/{res_id}/cancel", headers=headers)
    assert response.status_code == 200
    assert "reembolsado" in response.json()["message"].lower()

    # 9. Verificar que el saldo fue reembolsado
    response = client.get("/v1/user/me", headers=headers)
    # El saldo inicial era 0, cargamos 5000, la reserva costó algo (2 horas * 1500 = 3000), 
    # tras cancelar debería volver a 5000.
    assert response.json()["saldo"] == 5000.0

    print(f"\n[SUCCESS] Test de flujo completo finalizado para {email}")

if __name__ == "__main__":
    test_complete_user_flow()
