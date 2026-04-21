# 🌐 Contexto del Sistema: ParkingTech

Este documento describe la arquitectura de comunicación y el flujo de datos del ecosistema de estacionamiento inteligente.

## 📐 Arquitectura de 4 Capas

1.  **Capa de Captura (Edge)**: 
    - **ALPR Service**: OpenCV detecta el auto, captura una **fotografía de evidencia** y EasyOCR lee la patente.
2.  **Capa de Lógica (Backend)**:
    - **FastAPI**: Gestiona la lógica de negocios, el aforo y el **almacenamiento de imágenes**.
    - **Base de Datos (SQLite)**: Registra logs de acceso, estados de pago y rutas de imágenes.
3.  **Capa de Transporte (MQTT)**:
    - **Broker (HiveMQ)**: Distribuye comandos `OPEN` a los tópicos de **Entrada** o **Salida**.
4.  **Capa de Usuario (Administración)**:
    - **Dashboard Integrado**: Panel centralizado (servido por la API) para monitoreo visual, control de barreras y validación de pagos.

## 🔄 Flujos de Operación

### El "Camino de la Patente" (Ingreso)
1. El auto se detiene; `alpr_service.py` lee la patente y toma una foto.
2. Se envía un `POST` al Backend con la patente y la imagen en Base64.
3. El Backend guarda la foto, valida aforo/reserva y abre la barrera.
4. El log aparece en el Dashboard con la foto del vehículo.

### Flujo de Pago y Salida (Egreso)
1. El usuario paga en caja (o vía App).
2. El administrador marca el ingreso como **Pagado** en el Dashboard.
3. Al llegar a la salida, el ALPR reconoce la patente.
4. El Backend verifica: ¿Está Pago?
    - **SÍ** → Envía `OPEN` al tópico de salida.
    - **NO** → Mantiene barrera cerrada e informa deuda.

## 🛠️ Comandos de Inicio Rápido

- **Activar Entorno**: `venv\Scripts\activate`
- **Servidor + Dashboard**: `uvicorn main:app --reload` (Acceso: `http://localhost:8000/dashboard`)
- **Cámara (ALPR)**: `python alpr_service.py`
- **Simulador Hardware**: `python simulate_esp32.py`
