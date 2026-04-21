# 🚀 Guía de Inicialización: ParkingTech

Sigue estos pasos para poner en marcha el sistema con soporte de auditoría visual.

## 1. Requisitos Previos
- Python 3.9+ e instalar dependencias:
```bash
.\venv\Scripts\python.exe -m pip install fastapi uvicorn sqlalchemy paho-mqtt python-dotenv opencv-python easyocr
```

## 2. Ejecución (En orden)

### Paso A: Servidor API y Dashboard
```bash
.\venv\Scripts\python.exe -m uvicorn main:app --reload
```
*Acceso al Dashboard:* **http://localhost:8000/dashboard**

### Paso B: Simulador de Hardware
```bash
.\venv\Scripts\python.exe simulate_esp32.py
```

### Paso C: Servicio de Cámara (ALPR)
```bash
.\venv\Scripts\python.exe alpr_service.py
```

## 📸 Funcionamiento de la Auditoría Visual
1. Cuando la cámara detecta una patente, el Dashboard mostrará automáticamente la **foto del vehículo**.
2. Las imágenes se guardan en la carpeta `/captured_images`.
3. En la tabla de logs, puedes hacer clic en el icono 📷 para ver la foto de cualquier ingreso anterior.

## 🧪 Prueba de Pago y Salida
1. Simula o captura una entrada (Manual o vía Cámara).
2. Verás al vehículo aparecer en la sección **"🚘 Vehículos en el Predio"**.
3. Verás cómo su deuda aumenta en tiempo real según la tarifa configurada.
4. Haz clic en el botón **PAGAR** dentro de esa misma tabla.
5. Procede a simular la salida con la misma patente. La barrera solo abrirá si el estado cambió a **"✅ LISTO"**.
