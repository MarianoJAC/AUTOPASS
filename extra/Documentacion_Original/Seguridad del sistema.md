# 🛡️ Seguridad del Sistema: Smart-Parking ALPR

Este documento define los protocolos de seguridad física, lógica y de datos para el sistema de estacionamiento basado en flujo y reconocimiento de patentes.

---

## 🔐 1. Seguridad Lógica (Backend & API)

### 🛡️ Autenticación y Autorización
- **JWT (JSON Web Tokens)**: Todas las peticiones desde la App Móvil y el Panel Web deben incluir un token JWT válido en el header.
- **Roles de Acceso**:
    - `USER`: Solo puede ver aforo, reservar y pagar sus propias estancias.
    - `ADMIN`: Puede ajustar el aforo manual y abrir barreras remotamente.
    - `SYSTEM (ALPR)`: Solo puede enviar lecturas de patentes al endpoint de validación.

### 🗄️ Protección de la Base de Datos (SQLite)
- **Acceso Restringido**: El archivo `parking.db` reside en el servidor y no es accesible vía web. Solo el proceso de FastAPI tiene permisos de lectura/escritura.
- **Backups**: Copias de seguridad automáticas diarias para prevenir pérdida de datos por fallo de hardware.

---

## 💳 2. Seguridad en Pagos (Mercado Pago)

- **Delegación Total**: El sistema utiliza **Mercado Pago Checkout Pro**. Ningún dato de tarjeta de crédito o débito viaja por nuestros servidores.
- **Validación de Webhooks (IPN)**: Para confirmar un pago, el Backend verifica la firma digital del mensaje enviado por Mercado Pago para evitar ataques de inyección de pagos falsos.

---

## 📸 3. Privacidad y Seguridad ALPR

### 👁️ Gestión de Imágenes
- **Borrado Volátil**: Las imágenes capturadas para el reconocimiento de patentes se procesan en memoria y se eliminan inmediatamente después de obtener el texto (OCR). No se almacenan fotos de los vehículos ni de los conductores.
- **Hash de Patente**: En la base de datos, las patentes pueden ser almacenadas mediante un hash reversible solo para auditoría, protegiendo la identidad del usuario.

### 🚫 Prevención de Fraude
- **Validación Cruzada**: El sistema compara la patente detectada con la lista de reservas activas y el horario de entrada.
- **Detección de "Tailgating"**: El sensor de presencia de la barrera detecta si dos vehículos intentan pasar con una sola validación, disparando una alerta en el Panel Web.

---

## 🔌 4. Seguridad IoT (ESP32 & MQTT)

- **MQTT Auth**: El Broker Mosquitto requiere usuario y contraseña únicos para el ESP32. Se prohíben las conexiones anónimas.
- **Cifrado**: Recomendado el uso de **TLS/SSL** (puerto 8883) para la comunicación entre el ESP32 y el servidor si el parking está en una red abierta.
- **Watchdog Timer**: El firmware del ESP32 incluye un temporizador de reinicio automático si detecta que la conexión WiFi ha sido comprometida o se ha colgado.

---

## 🚧 5. Seguridad Física (Barreras)

- **Sensor Infrarrojo de Seguridad**: Obligatorio en la base de la barrera para detener el cierre si se detecta un objeto (auto o persona) en el camino del servomotor.
- **Modo Offline**: En caso de pérdida total de internet, el sistema permite la apertura manual mediante una llave física en el mecanismo de la barrera.
