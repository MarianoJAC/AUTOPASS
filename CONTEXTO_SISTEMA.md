# 🌐 Contexto del Sistema: ParkingTech

Este documento describe la arquitectura de comunicación y el flujo de datos del ecosistema de estacionamiento inteligente.

## 📐 Arquitectura del Ecosistema (v3.5+)

El sistema ha sido refactorizado bajo una arquitectura modular de alta escalabilidad:

1.  **Backend Modular (FastAPI Routers)**: 
    - `routes/auth.py`: Autenticación, registro y gestión de tokens.
    - `routes/parking.py`: Control de aforo y validación ALPR.
    - `routes/reports.py`: Analítica avanzada y reportes financieros.
    - `routes/user.py`: Portal del cliente y gestión de vehículos.
    - `routes/admin.py`: Operaciones de sistema y configuración.
    - `routes/system.py`: Utilidades de sistema y flujos de video.
2.  **Capa de Servicios (Service Pattern)**:
    - `services/billing_service.py`: Lógica centralizada de cobro y puntos AutoPass.
    - `alpr_service.py`: Motor de reconocimiento de patentes.
3.  **Frontend Premium (Modular JS)**: 
    - `templates/base.html`: Esqueleto maestro para consistencia visual.
    - `static/js/main.js`: Hub de utilidades globales y lógica base de UI.
    - `static/js/reservas.js`: Motor de gestión de reservas y cálculos automáticos.
    - `static/js/vehicles.js`: Gestión de flota del usuario.
    - `static/css/`: Hojas de estilo especializadas (`perfil.css`, `dashboard.css`) para carga bajo demanda.
    - Componentes Pro: Integración de **Chart.js**, **Flatpickr** y **html2canvas**.
## 🔐 Configuración y Seguridad
- **Variables de Entorno**: Configuración centralizada en archivo `.env` (MQTT, Secret Keys, DB URLs).
- **Token JWT**: Protección robusta de endpoints y persistencia de sesión.

## 🛠️ Comandos de Inicio Rápido (v3.1)

### 1. Preparación del Entorno
```powershell
# Instalar dependencias
pip install -r DEPENDENCIAS.md (o el comando de instalación rápida)
# Configurar variables
cp .env.example .env  # Si existiera, o editar .env directamente
```

### 2. Inicialización de Base de Datos
```powershell
python init_db.py
```

### 3. Ejecución del Servidor
```powershell
uvicorn main:app --reload
```

---
*Nota: Es fundamental correr `init_db.py` antes del primer inicio para asegurar que los roles y configuraciones iniciales existan.*
