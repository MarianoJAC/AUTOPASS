# 🌐 Contexto del Sistema: ParkingTech

Este documento describe la arquitectura de comunicación y el flujo de datos del ecosistema de estacionamiento inteligente.

## 📐 Arquitectura del Ecosistema

El sistema se divide en dos grandes áreas de acceso mediante **Roles (RBAC)**:

1.  **Panel de Administración (`rol: admin`)**:
    - Acceso a `/dashboard`.
    - Monitoreo de cámaras en tiempo real.
    - Gestión de usuarios y finanzas.
    - Control manual de barreras por MQTT.
2.  **Portal del Cliente (`rol: user`)**:
    - Acceso a `/perfil`.
    - Registro y gestión de vehículos propios (Patentes).
    - Creación de reservas digitales.
    - Visualización de deuda activa y pagos.

## 🔐 Seguridad y Autenticación
- **Token JWT**: Todas las comunicaciones entre el Frontend y la API están protegidas por JSON Web Tokens.
- **Validación de Identidad**: El ALPR valida el ingreso cruzando la patente detectada con los vehículos registrados.
- **Validación de Datos**: Registro de usuarios con validación de DNI numérico y contraseñas de alta seguridad (Min 8 caracteres, Mayúscula, Especial).

## 🔄 Flujos de Operación (Actualizados)

### Tarifas y Fidelización
- **Puntos AutoPass**: Los usuarios acumulan puntos por cada pago confirmado (10 pts x $100).
- **Historial Digital**: Acceso transparente a todas las transacciones pasadas desde el portal del cliente.
- **Reservas**: Un usuario crea una reserva -> El ALPR detecta la patente -> El sistema prioriza el ingreso aunque el aforo esté al límite.

### Interfaz y Experiencia
- **Lenguaje**: Sistema 100% localizado a **Español Argentino Formal**.
- **Acceso Directo**: Login y Registro integrados mediante modales en la página principal para una experiencia fluida.
- **Geolocalización**: Mapa interactivo en modo oscuro para localizar oficinas y puntos de servicio regionales.

## 🛠️ Comandos de Inicio Rápido (Consola)

### 1. Inicialización de Base de Datos
```powershell
python init_db.py
```
*(Crea tablas y usuario admin por defecto: `admin@autopass.com` / `admin123`)*

### 2. Servidor API y Web
```powershell
uvicorn main:app --reload
```
- **Landing**: http://localhost:8000/
- **Login**: http://localhost:8000/login
- **Dashboard**: http://localhost:8000/dashboard

### 3. Cámaras ALPR
```powershell
$env:GATE_TYPE="entrada"; python alpr_service.py
```

---
*Nota: Es fundamental correr `init_db.py` antes del primer inicio para asegurar que los roles y configuraciones iniciales existan.*
