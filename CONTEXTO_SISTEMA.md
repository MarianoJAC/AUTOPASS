# 🌐 Contexto del Sistema: ParkingTech

Este documento describe la arquitectura de comunicación y el flujo de datos del ecosistema de estacionamiento inteligente.

## 📐 Arquitectura de 4 Capas (Actualizada)

1.  **Capa de Captura (IP Edge)**: 
    - **Cámaras Móviles**: Uso de smartphones con "IP Webcam" como fuentes de video inalámbricas (IPv4).
    - **Procesamiento de Imagen**: Aplicación de CLAHE (contraste adaptativo) y Sharpening (nitidez) antes del OCR.
    - **Filtro de Consenso**: Validación de 3 lecturas idénticas en una ventana de 5 cuadros.
2.  **Capa de Lógica (Backend - FastAPI)**:
    - **Autenticación**: Portal **AUTOPASS** para registro de usuarios y patentes.
    - **Validación de Estado**: Prevención de ingresos duplicados.
    - **Gestión de Tarifas**: Cálculo de deuda en tiempo real.
3.  **Capa de Transporte (MQTT - HiveMQ)**:
    - **Comandos Físicos**: Publicación de comandos `OPEN` directamente a actuadores físicos (Arduino/ESP32).
4.  **Capa de Usuario (Dual)**:
    - **Admin**: Dashboard para monitoreo de logs, aforo y pagos.
    - **Cliente (AUTOPASS)**: Web para login, visualización de mapa y gestión de reservas personales.

## 🔄 Flujos de Operación

### El "Camino de la Patente" (Ingreso)
1. El auto se detiene; `alpr_service.py` lee la patente y toma una foto.
2. Se envía un `POST` a `/v1/access/validate-plate` con la patente y la imagen.
3. El Backend guarda la foto, valida aforo/reserva y abre la barrera via MQTT.
4. El log aparece en el Dashboard con la foto en el visor de **Última Entrada**.

### Gestión de Contingencia y Reservas
- **Ingreso Manual**: Permite registrar vehículos cuando la cámara no está operativa.
- **Reservas Recurrentes**: Soporte para abonados mensuales con selección de días (Lu-Do) y franjas horarias específicas.

### Flujo de Pago y Salida (Egreso)
1. El sistema calcula la deuda en vivo de los vehículos en el predio.
2. El administrador confirma el pago mediante el botón **"PAGAR"** en el Dashboard.
3. Al llegar a la salida, el ALPR reconoce la patente.
4. El Backend verifica el estado de pago:
    - **SÍ** → Envía `OPEN` y muestra evidencia en el visor de **Última Salida**.
    - **NO** → Informa deuda pendiente y mantiene la barrera cerrada.

## 🛠️ Comandos de Inicio Rápido

- **Activar Entorno**: `venv\Scripts\activate`
- **Servidor + Dashboard**: `uvicorn main:app --reload`
- **Portal Usuario**: `http://localhost:8000/login`
- **Cámara (ALPR)**: `python alpr_service.py`
- **Hardware**: Cargar `firmware_esp32.ino` en la placa real.
