# 📝 Estado del Proyecto: ParkingTech

## ✅ Implementado Correctamente

### 🧠 Backend (FastAPI)
- **Gestión de Reservas Recurrentes**: Lógica avanzada para abonados por mes, días de la semana y franjas horarias.
- **Autenticación y Usuarios**: Endpoints de login y registro (`/auth/login`, `/auth/register`) integrados con la base de datos.
- **Tarifas Dinámicas**: Sistema de configuración de precios desde el Dashboard con persistencia en DB.
- **Cálculo de Deuda en Vivo**: Endpoint que calcula el monto acumulado de cada vehículo estacionado en tiempo real.
- **Servicio de Auditoría**: Almacenamiento y vinculación de fotos para Entrada y Salida por separado.
- **Restricción de Seguridad**: Control de barreras condicionado al estado de pago y validez de reserva.

### 🖥️ Frontend (Admin & Usuario)
- **AUTOPASS Web**: Nuevas pantallas de Login, Registro, Mapa interactivo y Reservas para el usuario final (vía web).
- **Dashboard Administrativo**: Organización de tablas (Logs, Ocupación, Reservas) en secciones colapsables.
- **Monitor Financiero**: Tabla de "Vehículos en el Predio" con visualización de deuda y botón de pago rápido.
- **Vista Dual de Evidencia**: Dos visores independientes para monitorear la última Entrada y la última Salida.

### 👁️ Visión Artificial (ALPR Pro)
- **Filtro de Consenso (3x Check)**: Validación de patentes mediante comparación de 3 lecturas consecutivas idénticas.
- **Pre-procesamiento Adaptativo**: CLAHE y Sharpening para distinguir caracteres conflictivos.
- **Soporte de Cámaras IP**: Procesamiento de flujos de video inalámbricos desde smartphones.
- **Motor Multihilo**: Procesamiento asíncrono para garantizar tiempo real sin lag.

---

## 🛠️ Tareas Pendientes

### 1. App Móvil (Expo)
- Migración de la lógica web de AUTOPASS a una aplicación móvil nativa.
- Pago digital (Mercado Pago).

### 2. Seguridad Avanzada
- Implementar tokens JWT reales (actualmente se usa un token simulado para el prototipo).
- Cifrado real de contraseñas (bcrypt) antes de guardar en `password_hash`.
- Registro de facturación (historial de pagos realizados).

### 3. Historial & Reportes
- Panel para consultar logs históricos con filtros por fecha y patente.
- Exportación de reportes de recaudación en PDF/Excel.
