# 🚀 Guía de Inicialización: AUTOPASS

Sigue estos pasos para poner en marcha el ecosistema completo con soporte para usuarios y administración.

## 1. Requisitos Previos e Instalación
- Python 3.9+
- Dependencias necesarias:
```bash
pip install fastapi uvicorn sqlalchemy paho-mqtt python-dotenv opencv-python easyocr passlib[bcrypt] python-jose[cryptography]
```

## 2. Preparación de la Base de Datos (CRUCIAL)
Antes de iniciar el servidor, debes crear la estructura de datos y el usuario administrador:
```powershell
python init_db.py
```
**Credenciales por defecto:**
- **Email:** `admin@autopass.com`
- **Password:** `admin123`

## 3. Ejecución del Sistema

### Paso A: Servidor Backend y Web
```powershell
uvicorn main:app --reload
```
- Accede a la **Landing Page** en: `http://localhost:8000`
- Accede al **Panel Admin** en: `http://localhost:8000/dashboard`

### Paso B: Servicios ALPR (Cámaras)
Asegúrate de configurar el tipo de puerta según corresponda:
- **Entrada:** `$env:GATE_TYPE="entrada"; python alpr_service.py`
- **Salida:** `$env:GATE_TYPE="salida"; python alpr_service.py`

## 👥 Flujo de Usuario Final
1. El usuario se registra en la web (`/register`).
2. Ingresa a su perfil (`/perfil`) y añade la **Patente** de su vehículo.
3. El usuario puede realizar una **Reserva**.
4. Al llegar al parking, la cámara lo reconoce, le abre la barrera y le asigna la estadía a su cuenta automáticamente.

## 🧹 Mantenimiento
Si necesitas limpiar todos los datos (excepto el admin) para una nueva prueba:
```powershell
python reset_db.py
```
*Nota: Este comando ahora preserva la cuenta de administrador para no perder el acceso.*
