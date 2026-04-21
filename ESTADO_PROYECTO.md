# 📝 Estado del Proyecto: ParkingTech

## ✅ Implementado Correctamente

### 🧠 Backend (FastAPI)
- **Gestión de Reservas Recurrentes**: Lógica avanzada para abonados por mes, días de la semana y franjas horarias.
- **Tarifas Dinámicas**: Sistema de configuración de precios desde el Dashboard con persistencia en DB.
- **Cálculo de Deuda en Vivo**: Endpoint que calcula el monto acumulado de cada vehículo estacionado en tiempo real.
- **Servicio de Auditoría**: Almacenamiento y vinculación de fotos para Entrada y Salida por separado.
- **Restricción de Seguridad**: Control de barreras condicionado al estado de pago y validez de reserva.

### 🖥️ Frontend Administrativo (Dashboard)
- **Diseño de Acordeón**: Organización de tablas (Logs, Ocupación, Reservas) en secciones colapsables.
- **Monitor Financiero**: Tabla de "Vehículos en el Predio" con visualización de deuda y botón de pago rápido.
- **Vista Dual de Evidencia**: Dos visores independientes para monitorear la última Entrada y la última Salida.
- **Modo Contingencia**: Formulario de ingreso manual de patentes para operar sin cámaras.
- **Gestión de Precios**: Panel lateral para actualizar la tarifa por hora instantáneamente.

### 👁️ Visión Artificial (ALPR)
- **Motor Multihilo (Multithreading)**: Procesamiento de OCR en segundo plano para mantener el video fluido a 30 FPS.
- **Estrategia de Detección Dual**: Soporte optimizado para patentes Mercosur (fondo blanco) y patentes antiguas (fondo negro) mediante inversión de colores dinámica.
- **Filtros de Precisión (Regex)**: Validación estricta de formatos oficiales Argentinos (`AAA123` y `AA000AA`) para evitar ruido.
- **Optimización de Evidencia**: Envío asíncrono y compresión de capturas (640px JPG) para carga instantánea en el Dashboard.
- **Filtros de Imagen**: Implementación de Sharpening y Binarización Otsu para mejorar la distinción entre caracteres conflictivos (V, Y, N, etc.).

---

## 🛠️ Tareas Pendientes

### 1. App Móvil (Expo)
- Integración de la patente del usuario con su perfil.
- Pago digital (Mercado Pago).

### 2. Seguridad & Producción
- Implementar tokens JWT para proteger los endpoints de la API y el acceso al Dashboard.
- Cifrado de contraseñas de usuarios en la base de datos.
- Registro de facturación (historial de pagos realizados).

### 3. Historial & Reportes
- Panel para consultar logs históricos con filtros por fecha y patente.
- Exportación de reportes de recaudación en PDF/Excel.
