# 🏗️ Arquitectura del Sistema: Parking Mixto

Este documento detalla la estructura técnica del sistema, tanto a nivel de hardware como de software.

## 🛠️ Hardware Stack (Kits de Barrera)

| Componente | Modelo Específico | Función |
| :--- | :--- | :--- |
| **Microcontrolador** | **ESP32 DevKit V1** | Gestiona los kits de Entrada y Salida |
| **Detección de Vehículo** | **HC-SR04 / Infrarrojo** | Detecta auto frente a la barrera |
| **Cámara ALPR (Simulada)** | **Smartphone + IP Webcam** | Captura de imagen para reconocimiento de patente |
| **Actuador de Barrera** | **Servomotor SG90** | Apertura/Cierre automático |
| **Interfaz de Entrada** | **LCD 16x2 I2C** | Muestra aforo y bienvenida |
| **Procesamiento ALPR** | **Servidor Python (PC)** | Ejecuta OCR (EasyOCR/Tesseract) sobre el feed del móvil |
| **Conectividad** | WiFi 2.4GHz | Comunicación MQTT entre ESP32 y Backend |

## 💻 Software Stack

### 🔹 Backend & AI (Unificado en Python)
- **Framework**: **FastAPI** (Python 3.10+). Elegido por su alto rendimiento, validación automática de datos y facilidad para integrar librerías de IA.
- **Base de Datos**: **SQLite**. Base de datos relacional ligera que no requiere servidor externo, ideal para la portabilidad de la maqueta.
- **Módulo AI**: Integrado o como microservicio usando `OpenCV` y `EasyOCR` para el procesamiento de patentes.
- **Comunicación Real-Time**: MQTT (Mosquitto) para el control de barreras y WebSockets para actualizaciones del Dashboard.

## 🗄️ Arquitectura de Datos (Puente Centralizado)

Para garantizar la seguridad y la integridad de la información, el sistema sigue un modelo de **3 capas**:

1.  **Capa de Cliente (App Móvil / Web Admin / Script ALPR)**: Ninguna aplicación cliente tiene acceso directo al archivo de la base de datos. Todas las operaciones de lectura/escritura se realizan mediante peticiones HTTP (REST) o WebSockets al Backend.
2.  **Capa de Lógica (FastAPI)**: Actúa como el **único intermediario**. Recibe las peticiones, valida la autenticación (JWT), aplica las reglas de negocio (ej: verificar cupos) y ejecuta las consultas SQL.
3.  **Capa de Persistencia (SQLite)**: Archivo local gestionado exclusivamente por el servidor FastAPI.

---

## 📡 Protocolo de Comunicación

1. **Evento de Barrera**:
   - ESP32 → `PUBLISH` a `parking/barrera/entrada/deteccion`.
   - Script ALPR (Python) → Procesa video → Petición interna a FastAPI.
   - FastAPI → Valida en SQLite → `PUBLISH` a `parking/barrera/entrada/control` (`{"command": "OPEN"}`).
   - ESP32 → Activa Servomotor.


2. **Gestión de Aforo**:
   - Cada evento de entrada exitosa descuenta 1 al `current_capacity`.
   - Cada evento de salida suma 1 al `current_capacity`.


## 📊 Entidades de Base de Datos (Mínimo)

- **Plazas**: `id_plaza`, `tipo` (Normal, Discapacitado), `estado` (Libre, Reservado, Ocupado).
- **Reservas**: `id_reserva`, `id_usuario`, `fecha_hora_inicio`, `fecha_hora_fin`, `codigo_qr`, `estado` (Pendiente, Activa, Finalizada).
- **Uso Al Paso**: `id_sesion`, `id_plaza`, `hora_entrada`, `hora_salida`.
