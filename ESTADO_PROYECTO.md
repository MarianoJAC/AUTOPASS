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

### 👁️ Visión Artificial (ALPR Pro)
- **Filtro de Consenso (3x Check)**: Validación de patentes mediante comparación de 3 lecturas consecutivas idénticas en el búfer para eliminar falsos positivos.
- **Pre-procesamiento Adaptativo**: Implementación de CLAHE (contraste) y Sharpening (nitidez) para distinguir caracteres conflictivos como 'D' vs 'O'.
- **Soporte de Cámaras IP**: Adaptación del servicio ALPR para procesar flujos de video inalámbricos desde smartphones (IP Webcam).
- **Prevención de Duplicados en Backend**: Lógica que prohíbe una nueva 'ENTRADA' si el vehículo ya figura dentro del predio.
- **Motor Multihilo sin Lag**: Procesamiento asíncrono que garantiza la visualización en tiempo real capturando siempre el cuadro más reciente.

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
