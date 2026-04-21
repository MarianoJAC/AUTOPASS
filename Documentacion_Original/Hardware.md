# 🔌 Detalle de Hardware y Circuitos (Modelo por Flujo)

## 📍 Pinout Sugerido (ESP32 - Kit Barrera)

| Componente | Pin ESP32 | Función |
| :--- | :--- | :--- |
| **Sensor Proximidad (Barrera)** | GPIO 12 (Trig), GPIO 13 (Echo) | Detecta vehículo para activar cámara |
| **Servomotor (Barrera)** | GPIO 14 (PWM) | Apertura/Cierre |
| **Pantalla LCD (I2C)** | GPIO 21 (SDA), GPIO 22 (SCL) | Interfaz de usuario (Entrada) |
| **LED Indicador Estado** | GPIO 2 (Rojo/Verde) | Status de conexión/validación |

## 📱 Simulación ALPR (Cámara con Celular)

Para la maqueta, se utiliza un smartphone como sensor de visión artificial:

1. **Configuración del Celular**:
   - Instalar App **"IP Webcam"** (Android).
   - Iniciar servidor de video (genera una URL como `http://192.168.1.50:8080/video`).
   - Montar el celular en un soporte que apunte a la patente del auto de la maqueta.

2. **Servidor de Procesamiento (Python)**:
   - **Librerías**: `opencv-python`, `easyocr` (o `pytesseract`) y `requests`.
   - **Flujo**:
     - El script lee el stream de video del celular.
     - Al detectar un objeto (auto), toma un frame y aplica OCR.
     - Envía la patente reconocida al Backend vía `POST /access/validate-plate`.

## 🚧 Mecanismo de la Barrera (Entrada y Salida)

El servomotor se controla mediante señales PWM:
- **Cerrado**: 90° (Posición horizontal).
- **Abierto**: 0° (Posición vertical).
- **Seguridad**: Se recomienda un sensor infrarrojo adicional en la base para evitar que la barrera baje si el vehículo no ha terminado de pasar.

## 📟 Interfaz LCD (Entrada)

La pantalla LCD mostrará información dinámica de aforo:
- **Estado Reposo**: "LIBRE: [X] / 20"
- **Detección**: "LEYENDO PATENTE..."
- **Acceso Exitoso**: "BIENVENIDO [PATENTE]\nPASE POR FAVOR"
- **Acceso Denegado**: "PARKING LLENO\nSOLO RESERVAS"

## 🛡️ Diagrama de Alimentación

1. **ESP32**: Alimentado vía Micro-USB o regulador de 5V a 3.3V.
2. **Servomotor**: Requiere 5V externos (no alimentar directamente del pin de 3.3V del ESP32 para evitar caídas de tensión).
3. **Sensores**: Pueden operar a 5V (Trig/Echo requieren divisor de tensión para el Echo de 5V a 3.3V hacia el ESP32).
