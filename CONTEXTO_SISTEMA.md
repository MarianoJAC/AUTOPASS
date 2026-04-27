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
1. El usuario se registra en **AUTOPASS** y vincula su patente.
2. Al llegar al parking, `alpr_service.py` lee la patente.
3. El Backend valida que el usuario tenga una reserva activa o que haya aforo disponible.
4. Si es válido, se abre la barrera vía MQTT y se guarda la foto de auditoría.

### Gestión de Pagos y Salida
1. El administrador confirma el pago desde el Dashboard (o el usuario vía reserva previa).
2. Al detectar la salida, el Backend verifica el estado de pago.
3. Si está OK, envía `OPEN` a la barrera de salida.

## 🛠️ Comandos de Inicio Rápido

- **Activar Entorno**: `venv\Scripts\activate`
- **Servidor + Dashboard**: `uvicorn main:app --reload`
- **Portal Usuario**: `http://localhost:8000/login`
- **Cámara (ALPR)**: `python alpr_service.py`
- **Hardware**: Cargar `firmware_esp32.ino` en la placa real.
