# 🌐 Contexto del Sistema: ParkingTech

Este documento describe la arquitectura de comunicación y el flujo de datos del ecosistema de estacionamiento inteligente.

## 📐 Arquitectura de 4 Capas

1.  **Capa de Captura (Edge)**: 
    - **ALPR Pro (Multithreaded)**: OpenCV captura video fluido a 30 FPS. Un hilo secundario procesa cada frame con EasyOCR.
    - **Dual Scan**: Analiza cada bloque de texto dos veces (Normal e Invertido) para detectar patentes de fondo blanco (Mercosur) y fondo negro (Antiguas) con igual eficacia.
    - **Evidencia Asíncrona**: Una vez validada la patente, el sistema dispara un envío de la captura comprimida (JPG 640px) al Backend sin detener el escaneo activo.
2.  **Capa de Lógica (Backend)**:
    - **FastAPI**: Gestiona la lógica de negocios, el aforo, el **almacenamiento de imágenes** y la **configuración de tarifas dinámicas**.
    - **Base de Datos (SQLite)**: Registra logs de acceso, reservas, estados de pago y configuración de precios.
3.  **Capa de Transporte (MQTT)**:
    - **Broker (HiveMQ)**: Distribuye comandos `OPEN` a los tópicos de **Entrada** o **Salida**.
4.  **Capa de Usuario (Administración)**:
    - **Dashboard Integrado**: Panel centralizado para monitoreo visual (Entrada/Salida), gestión de reservas recurrentes, control de barreras y caja en tiempo real.

## 🔄 Flujos de Operación

### El "Camino de la Patente" (Ingreso)
1. El auto se detiene; `alpr_service.py` lee la patente y toma una foto.
2. Se envía un `POST` al Backend con la patente y la imagen.
3. El Backend guarda la foto, valida aforo/reserva y abre la barrera.
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
- **Servidor + Dashboard**: `uvicorn main:app --reload` (Acceso: `http://localhost:8000/dashboard`)
- **Cámara (ALPR)**: `python alpr_service.py`
- **Simulador Hardware**: `python simulate_esp32.py`
