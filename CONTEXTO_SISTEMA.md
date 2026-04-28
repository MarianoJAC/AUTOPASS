# 🌐 Contexto del Sistema: ParkingTech

Este documento describe la arquitectura de comunicación y el flujo de datos del ecosistema de estacionamiento inteligente.

## 📐 Arquitectura de Puertas (Unificada)

Para garantizar la sincronización entre el ALPR, el Backend y el Dashboard, se han estandarizado los IDs de las puertas:

1.  **Entrada (`ENTRADA_PRINCIPAL`)**:
    - **Cámara**: Webcam local o IP Cam vinculada a este ID.
    - **Lógica**: Valida aforo y registra ingresos.
    - **MQTT**: Publica en `parking/barrera/entrada/control`.
2.  **Salida (`SALIDA_PRINCIPAL`)**:
    - **Cámara**: IP Cam inalámbrica o secundaria.
    - **Lógica**: Valida estado de pago antes de autorizar egreso.
    - **MQTT**: Publica en `parking/barrera/salida/control`.

## 🔄 Flujos de Operación (Actualizados)

### Tarifas y Pagos
- **Cálculo Dinámico**: La deuda se calcula como `(Tiempo en minutos / 60) * TarifaConfigurada`. 
- **Mínimo Cobrable**: El sistema aplica el costo de 1 hora completa para cualquier estadía inferior a 60 minutos.
- **Validación de Egreso**: El Backend deniega la salida si el último registro de entrada no tiene `pago_confirmado = True`.

### Optimización OCR
- **Consenso 2X**: El sistema valida la patente tras 2 cuadros idénticos (antes 3X), permitiendo una respuesta mucho más rápida en entornos con ruido visual o pantallas.
- **Soporte Híbrido**: Reconocimiento mejorado para patentes Mercosur (7 chars) y Formato Viejo (6 chars).

## 🛠️ Comandos de Inicio Rápido (Consola)

### 1. Servidor y Dashboard
```powershell
uvicorn main:app --reload
```
*(Acceso: http://localhost:8000/dashboard)*

### 2. Cámara de Entrada
```powershell
$env:GATE_TYPE="entrada"; python alpr_service.py
```

### 3. Cámara de Salida
```powershell
$env:VIDEO_SOURCE="URL_DE_TU_IPCAM"; $env:GATE_TYPE="salida"; python alpr_service.py
```

### 4. Simulador de Barreras (Hardware)
```powershell
python simulate_esp32.py
```

---
*Nota: Asegúrese de que el Backend esté corriendo antes de iniciar los servicios ALPR para que el Heartbeat se registre correctamente.*
