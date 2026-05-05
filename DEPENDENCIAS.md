# 📦 Dependencias del Proyecto: AUTOPASS

Este documento detalla las librerías y herramientas necesarias para el funcionamiento del ecosistema completo de ParkingTech.

## 🐍 Requisitos de Entorno
- **Python**: 3.9 o superior.
- **Gestor de paquetes**: pip (actualizado).

## 🛠️ Librerías Principales

### 🚀 Backend y Servidor
- **`fastapi`**: Framework moderno y rápido para construir la API.
- **`uvicorn`**: Servidor ASGI de alto rendimiento para ejecutar la aplicación.
- **`sqlalchemy`**: ORM para la gestión de la base de datos SQLite.
- **`python-dotenv`**: Gestión de variables de entorno (archivo `.env`).
- **`jinja2`**: Motor de plantillas para renderizado de HTML con herencia.

### 🔐 Seguridad y Autenticación
- **`passlib[bcrypt]`**: Hashing seguro de contraseñas.
- **`python-jose[cryptography]`**: Generación y validación de tokens JWT (JSON Web Tokens).

### 👁️ Visión Artificial (ALPR)
- **`opencv-python`**: Procesamiento de imágenes y manejo de streams de video.
- **`easyocr`**: Motor de reconocimiento óptico de caracteres para la lectura de patentes.
- **`torch` / `torchvision`**: (Instalados automáticamente por EasyOCR) Motor de Deep Learning.

### 📡 Comunicación y Utilidades
- **`paho-mqtt`**: Cliente para la comunicación con el broker MQTT (apertura de barreras).
- **`requests`**: Realización de peticiones HTTP entre servicios.

---

## 📥 Comando de Instalación Rápida

Puedes instalar todas las dependencias ejecutando:

```bash
pip install fastapi uvicorn sqlalchemy python-dotenv jinja2 passlib[bcrypt] python-jose[cryptography] paho-mqtt requests opencv-python easyocr
```

## 📋 Resumen de Versiones (pip freeze)
Para asegurar la reproducibilidad, se recomienda el uso de un entorno virtual (`venv`). Las versiones principales probadas son:
- FastAPI >= 0.100.0
- SQLAlchemy >= 2.0.0
- Paho-MQTT >= 2.0.0 (con soporte para Callback API v2)
- EasyOCR >= 1.7.0
