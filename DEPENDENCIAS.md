# 📦 Dependencias del Proyecto: ParkingTech

Este documento detalla las bibliotecas de Python necesarias para el funcionamiento del sistema y el rol que cumple cada una en la arquitectura.

## 🚀 Backend y API (FastAPI)

*   **`fastapi`**: Framework moderno y de alto rendimiento para construir la API. Maneja las rutas de validación de patentes, gestión de logs y el dashboard.
*   **`uvicorn`**: Servidor ASGI encargado de ejecutar la aplicación FastAPI y permitir el acceso web (puerto 8000).
*   **`sqlalchemy`**: El ORM (Object-Relational Mapper) que facilita la comunicación con la base de datos SQLite (`parking.db`), permitiendo manejar tablas como si fueran objetos de Python.

## 👁️ Visión Artificial y ALPR

*   **`opencv-python` (cv2)**: La biblioteca fundamental para el procesamiento de imágenes. Se encarga de capturar el video de la cámara, redimensionar cuadros, aplicar filtros de contraste y mostrar la interfaz visual en tiempo real.
*   **`easyocr`**: Motor de Reconocimiento Óptico de Caracteres (OCR). Es el "cerebro" que extrae el texto de las patentes detectadas en la imagen. Soporta múltiples idiomas y arquitecturas de aprendizaje profundo.
*   **`numpy`**: Utilizada para el manejo de matrices y cálculos matemáticos complejos requeridos por OpenCV y el procesamiento de imágenes.

## 📡 Comunicación y Transporte

*   **`paho-mqtt`**: Cliente para el protocolo MQTT. Permite que el Backend envíe comandos de apertura (`OPEN`) a la barrera (ESP32 o Simulador) de forma instantánea a través de un broker (HiveMQ).
*   **`requests`**: Utilizada por el script `alpr_service.py` para enviar las patentes detectadas mediante peticiones HTTP POST hacia la API del Backend.

## 🛠️ Utilidades y Configuración

*   **`python-dotenv`**: Permite cargar variables de entorno desde el archivo `.env`. Esto asegura que las credenciales (MQTT_BROKER, BACKEND_URL) no estén hardcodeadas en el código.
*   **`pydantic`**: (Incluida con FastAPI) Se utiliza en el archivo `schemas.py` para validar que los datos que llegan a la API (como el formato de la patente) sean correctos antes de procesarlos.

---

## 🛠️ Instalación Rápida

Para instalar todas estas dependencias en un entorno nuevo, puedes usar:

```bash
pip install fastapi uvicorn sqlalchemy paho-mqtt python-dotenv opencv-python easyocr numpy requests
```
