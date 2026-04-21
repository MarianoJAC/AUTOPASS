# 📝 Estado del Proyecto: ParkingTech

## ✅ Implementado Correctamente

### 🧠 Backend (FastAPI)
- **Servicio de Auditoría**: Almacenamiento local de fotos capturadas por el ALPR vinculadas a cada ingreso.
- **Gestión de Archivos**: Servidor de archivos estáticos para visualizar evidencia fotográfica.
- **Restricción de Seguridad**: Bloqueo de barrera de salida si el pago no está confirmado.
- **Flujo de Cobro**: Cálculo de tiempo/costo y endpoint de confirmación de pago.

### 🖥️ Frontend Administrativo
- **Dashboard Integrado**: Ahora servido directamente por FastAPI en `/dashboard`.
- **Visor de Evidencia**: Sección de "Última Captura" con imagen en tiempo real y links a fotos en el historial.
- **Control Unificado**: Gestión de aforo, pagos y barreras desde una sola interfaz.

### 👁️ Visión Artificial
- **ALPR con Captura**: El servicio `alpr_service.py` envía la patente junto con el frame capturado al servidor.

---

## 🛠️ Tareas Pendientes

### 1. App Móvil (Expo)
- Integración de la patente del usuario con su perfil.
- Pago digital (Mercado Pago).

### 2. Seguridad & Producción
- Implementar tokens JWT para proteger los endpoints de la API y el acceso al Dashboard.
- Cifrado de contraseñas de usuarios en la base de datos.
