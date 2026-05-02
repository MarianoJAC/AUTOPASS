# ⚙️ Guía de Configuración Inicial (Setup)

Este documento detalla los pasos necesarios para preparar el entorno de desarrollo del Sistema de Parking Mixto.

## 🔌 Entorno de Hardware (Firmware)

1. **Software Necesario**:
   - Instalar [Arduino IDE](https://www.arduino.cc/en/software) o [PlatformIO](https://platformio.org/) (recomendado para ESP32).
2. **Bibliotecas Requeridas**:
   - `PubSubClient`: Para comunicación MQTT.
   - `ArduinoJson`: Para formatear datos JSON.
   - `LiquidCrystal_I2C`: Para el control de la pantalla LCD.
   - `ESP32Servo`: Para controlar el servomotor de la barrera.
   - `MFRC522`: Si utilizas lector RFID.
3. **Configuración de Red**:
   - Definir `SSID` y `PASSWORD` de la red WiFi local en el archivo de configuración del firmware.
   - Configurar la IP del Broker MQTT y la URL del servidor backend.

## 💻 Entorno de Software (Backend & AI)

1. **Requisitos Previos**:
   - [Python](https://www.python.org/) (v3.10+).
   - [Pip](https://pip.pypa.io/en/stable/) (Gestor de paquetes de Python).
   - [Mosquitto](https://mosquitto.org/) (Broker MQTT local).

2. **Instalación de Dependencias**:
   ```bash
   # Crear entorno virtual
   python -m venv venv
   source venv/bin/activate  # En Windows: venv\Scripts\activate

   # Instalar core
   pip install fastapi uvicorn sqlalchemy paho-mqtt
   
   # Instalar dependencias de Visión Artificial (ALPR)
   pip install opencv-python easyocr requests
   ```

3. **Pasos Iniciales**:
   - Configurar archivo `.env` con las credenciales del Broker MQTT y la URL de la IP Webcam del celular.
   - Ejecutar el servidor: `uvicorn main:app --reload`.

## 🛠️ Herramientas de Testeo Recomendadas

- **MQTT Explorer**: Para visualizar los mensajes de los sensores en tiempo real.
- **Postman/Insomnia**: Para probar los endpoints de la API REST.
- **Tinkercad / Wokwi**: Para simular el circuito del ESP32 si no tienes el hardware físico a mano. Tinkercad es ideal para la parte visual, mientras que Wokwi permite simular WiFi real.
