# 🚀 Guía de Inicialización: ParkingTech

Sigue estos pasos para poner en marcha el sistema con soporte de auditoría visual.

## 1. Requisitos Previos
- Python 3.9+ e instalar dependencias:
```bash
.\venv\Scripts\python.exe -m pip install fastapi uvicorn sqlalchemy paho-mqtt python-dotenv opencv-python easyocr
```

## 2. Ejecución (En orden)

### Paso A: Servidor API y Dashboard
```powershell
.\venv\Scripts\activate
uvicorn main:app --reload
```
*Acceso al Dashboard:* **http://localhost:8000/dashboard**

### Paso B: Hardware o Simulador (Elegir uno)
- **Físico (Recomendado):** Conectar tu Arduino/ESP32 (Ver `Guia_Hardware/Conexion_Arduino.md`).
- **Simulador:** `python simulate_esp32.py` (Solo si no tienes hardware).

### Paso C: Cámaras ALPR (Doble Celular)
Abre dos terminales y usa el IP proporcionado por la App "IP Webcam":

**Terminal 1 (ENTRADA):**
```powershell
$env:VIDEO_SOURCE="http://192.168.0.88:8080/video"; $env:GATE_ID="ENTRADA_SUR"; $env:GATE_TYPE="entrada"; python alpr_service.py
```

**Terminal 2 (SALIDA):**
```powershell
$env:VIDEO_SOURCE="http://192.168.0.90:8080/video"; $env:GATE_ID="SALIDA_SUR"; $env:GATE_TYPE="salida"; python alpr_service.py
```

## 🧹 Limpieza del Sistema
Para resetear el Dashboard, borrar fotos y poner el aforo en cero antes de una demostración:
```powershell
python reset_db.py
```

## 📸 Funcionamiento ALPR Pro
1. **Consenso 3x**: La cámara debe ver la misma patente 3 veces para validarla (evita errores).
2. **Filtros Nitidez**: Se aplica Sharpening y CLAHE automáticamente para distinguir letras difíciles (D vs O).
3. **Control de Duplicados**: Si intentas ingresar un auto que ya está "ADENTRO", el sistema denegará el acceso.

## 🧪 Prueba de Pago y Salida
1. Simula o captura una entrada (Manual o vía Cámara).
2. Verás al vehículo aparecer en la sección **"🚘 Vehículos en el Predio"**.
3. Verás cómo su deuda aumenta en tiempo real según la tarifa configurada.
4. Haz clic en el botón **PAGAR** dentro de esa misma tabla.
5. Procede a simular la salida con la misma patente. La barrera solo abrirá si el estado cambió a **"✅ LISTO"**.
