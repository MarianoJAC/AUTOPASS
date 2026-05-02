# 🚀 Especificación de la API: ParkingTech

Esta API centraliza la lógica de negocio y permite la interacción entre la App Móvil (Expo), el Módulo AI (Python), el Hardware (ESP32) y el Panel Administrativo.

**Base URL**: `http://localhost:8000/v1` (Desarrollo)  
**Protocolo**: REST (JSON) + WebSockets (Aforo Real-time)

---

## 🔐 1. Autenticación y Usuario
| Endpoint | Método | Descripción | Requerido por |
| :--- | :--- | :--- | :--- |
| `/auth/register` | `POST` | Registro de usuario y patente principal | App Móvil |
| `/auth/login` | `POST` | Login y obtención de JWT | App / Web |
| `/user/profile` | `GET` | Perfil, patentes vinculadas y saldo de puntos | App Móvil |

---

## 📅 2. Reservas y Pagos (Mercado Pago)
| Endpoint | Método | Descripción | Requerido por |
| :--- | :--- | :--- | :--- |
| `/reservations` | `POST` | Crear reserva y obtener `preference_id` de MP | App Móvil |
| `/reservations/active` | `GET` | Ver reserva actual y estado de autorización | App Móvil |
| `/payments/webhook` | `POST` | **Webhook**: Mercado Pago notifica éxito del pago | Mercado Pago |

---

## 📍 3. Aforo y Disponibilidad
| Endpoint | Método | Descripción | Requerido por |
| :--- | :--- | :--- | :--- |
| `/parking/status` | `GET` | Capacidad total y ocupación actual | App / Web |
| `/parking/ws` | `WS` | **WebSocket**: Stream de actualización de aforo | App / Web |

---

## 🚧 4. Control de Acceso (ALPR & Hardware)
| Endpoint | Método | Descripción | Requerido por |
| :--- | :--- | :--- | :--- |
| `/access/validate-plate`| `POST` | Valida patente detectada por AI para abrir barrera | Script Python |
| `/access/logs` | `GET` | Historial de capturas y accesos | Panel Web |

---

## 🎁 5. Fidelización y Promociones
| Endpoint | Método | Descripción | Requerido por |
| :--- | :--- | :--- | :--- |
| `/user/points/log` | `GET` | Historial de ganancia y canje de puntos | App Móvil |
| `/user/points/redeem` | `POST` | Canjear puntos por beneficios | App Móvil |
| `/coupons/validate` | `POST` | Validar código de descuento para reserva | App Móvil |

---

## 🛠️ Ejemplos de Payload

### Crear Reserva (`POST /reservations`)
```json
{
  "user_id": 1,
  "patente": "ABC1234",
  "start_time": "2026-04-18T14:30:00Z",
  "duration_hours": 2,
  "coupon_code": "PROMO10" // Opcional
}
```

### Validar Patente AI (`POST /access/validate-plate`)
```json
{
  "plate": "ABC1234",
  "gate_id": "ENTRADA_PRINCIPAL"
}
```
**Respuesta (200 OK)**:
```json
{
  "status": "allowed",
  "action": "OPEN_GATE",
  "message": "Bienvenido, Juan. Acceso por reserva habilitado."
}
```

### Webhook Mercado Pago (`POST /payments/webhook`)
```json
{
  "action": "payment.created",
  "data": { "id": "123456789" }
}
```
