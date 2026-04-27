# 📝 Estado del Proyecto: ParkingTech

## ✅ Implementado Correctamente

### 🧠 Backend (FastAPI)
- **Sincronización de API v1**: Implementación de `APIRouter` con prefijo `/v1` para cumplir con la especificación técnica.
- **Gestión de Reservas Recurrentes**: Lógica avanzada para abonados por mes, días de la semana y franjas horarias.
- **Autenticación y Usuarios**: Endpoints de login y registro (`/auth/login`, `/auth/register`) integrados con la base de datos.
- **Tarifas Dinámicas**: Sistema de configuración de precios desde el Dashboard con persistencia en DB.
- **Cálculo de Deuda en Vivo**: Endpoint que calcula el monto acumulado de cada vehículo estacionado en tiempo real.
- **Servicio de Auditoría**: Almacenamiento y vinculación de fotos para Entrada y Salida por separado.
- **Restricción de Seguridad**: Control de barreras condicionado al estado de pago y validez de reserva.

### 🖥️ Frontend Administrativo (Dashboard)
- **Refactorización SPA**: Actualización de todas las llamadas de red para utilizar la API v1.
- **Diseño de Acordeón**: Organización de tablas (Logs, Ocupación, Reservas) en secciones colapsables.
- **Monitor Financiero**: Tabla de "Vehículos en el Predio" con visualización de deuda y botón de pago rápido.
- **Vista Dual de Evidencia**: Dos visores independientes para monitorear la última Entrada y la última Salida.
- **Modo Contingencia**: Formulario de ingreso manual de patentes para operar sin cámaras.

### 👁️ Visión Artificial (ALPR Pro)
- **Cliente API v1**: Actualización del script `alpr_service.py` para comunicación con el nuevo esquema de endpoints.
- **Filtro de Consenso (3x Check)**: Validación de patentes mediante comparación de 3 lecturas consecutivas idénticas en el búfer para eliminar falsos positivos.

---

## 🛠️ Tareas Pendientes

### 1. Seguridad & Producción
- **Implementar tokens JWT** para proteger los endpoints de la API y el acceso al Dashboard.
- **Cifrado de contraseñas** de usuarios en la base de datos (Hashing con bcrypt/argon2).

### 2. App Móvil (Expo)
- Integración de la patente del usuario con su perfil.
- Pago digital (Mercado Pago).

### 3. Historial & Reportes
- **Reportes Avanzados**: Exportación de reportes de recaudación en PDF/Excel (CSV ya implementado).
- **Dashboard de Tendencias**: Gráficos históricos de ocupación por semana/mes.
