# Estado del Proyecto: ParkingTech (Actualizado 2026-05-02)

### 🚀 Hitos Recientes

### 🏗️ Arquitectura Professional (¡NUEVO v3.0!)
- [x] **Modularización del Backend**: Segmentación de `main.py` en 6 routers especializados (`routes/`).
- [x] **Patrón de Servicio**: Lógica de negocio (Dinero/Puntos) aislada en `BillingService`.
- [x] **Frontend Pro (Jinja2)**: Implementación de herencia de plantillas (`base.html`) para eliminar redundancia.
- [x] **Configuración Centralizada**: Gestión de secretos y entorno vía archivo `.env`.

### 📊 Analítica y Reporting (¡NUEVO!)
- [x] **Gráficos Dinámicos**: Integración de **Chart.js** para visualizar tendencias de recaudación en el tiempo.
- [x] **Filtrado Avanzado**: Selector de periodos (Día, Semana, Mes, Año) y rangos personalizados.
- [x] **Calendario Pro**: Integración de **Flatpickr** para una selección de fechas interactiva y moderna.

### 🎨 UI/UX & Identidad Visual
- [x] **Armonización de Estilo**: Todos los templates (Index, Dashboard, Perfil, Contacto) con estética Premium (Dorado/Negro).
- [x] **Limpieza Funcional**: Interfaces operativas con fondos sólidos y alto contraste para reducir fatiga visual.
- [x] **Acceso Simplificado**: Migración de páginas de Login/Registro a **Modales Interactivos** en la Home.
- [x] **Iconografía de Alta Gama**: Integración total de **Font Awesome 6** (eliminación de emojis).
- [x] **Mapa Interactivo**: Nueva sección "Encuéntrenos" con mapa en modo oscuro, geolocalización y puntos regionales (Ituzaingó, Castelar, Morón).

### 🔐 Seguridad y Autenticación
- [x] **JWT Auth**: Implementación de tokens de seguridad para proteger la API y el Dashboard.
- [x] **Validación Anti-Flicker**: Las rutas protegidas (/dashboard, /perfil) son invisibles para usuarios no autorizados antes de la redirección.
- [x] **Validaciones Robustas**: Registro con reglas estrictas para DNI numérico y contraseñas seguras (Especial/Mayúscula).

### 🌐 Interfaz Web & Funcionalidad
- [x] **Landing Page Pro**: Página de inicio moderna con modals y navegación fluida.
- [x] **Portal del Cliente (Perfil)**: El usuario gestiona sus vehículos y ve su deuda en tiempo real.
- [x] **Historial de Pagos**: Visualización detallada de transacciones confirmadas para cada usuario.
- [x] **Sistema de Puntos AutoPass**: Gamificación que otorga 10 puntos por cada $100 gastados automáticamente.
- [x] **Página de Contacto**: Nueva sección profesional con formulario y detalles corporativos.

### Backend y Lógica de Negocio
- [x] **Normalización de Patentes**: Lógica mejorada para vincular vehículos de usuarios con los registros del ALPR.
- [x] **Cálculo de Deuda en Perfil**: Los clientes ven su costo acumulado actualizado cada 30 segundos.

### ✨ Mejoras de Experiencia y Seguridad (v3.5+)
- [x] **Ticket Digital Premium**: Sustitución del sistema básico de compartir por un **Voucher Visual** con QR dinámico, compartible como **imagen PNG** (vía WhatsApp) usando `html2canvas`.
- [x] **Validación de Registro Avanzada**: Checklist en tiempo real para contraseñas (8+ carac, Mayúscula, Símbolo) y medidor de fuerza visual.
- [x] **Edición "In-Place" en Perfil**: Gestión de datos personales (DNI, Teléfono, etc.) directamente en las tarjetas, eliminando diálogos del navegador para una experiencia nativa.
- [x] **Calculadora de Reservas**: Estimación de costos en tiempo real con obtención dinámica de tarifas desde la DB ($1500/hora con redondeo).
- [x] **Gestión Modular de Reservas**: Separación de *Próximas Reservas* e *Historial*, este último con diseño desplegable y filtro por rango de fechas.
- [x] **Normalización Regional**: Formateo automático de DNI (puntos) y Teléfonos (espacios) en toda la interfaz para mayor legibilidad.
- [x] **Seguridad de Datos**: Sincronización robusta de identidad (Nombre/Apellido) en almacenamiento local para personalización de tickets.

## 🛠️ Pendientes Inmediatos (Backlog)
1. **Integración Real de Pagos**: Conectar el botón "Pagar" con la API de Mercado Pago.
2. **Canje de Puntos**: Implementar sistema para usar los Puntos AutoPass en beneficios o descuentos.
3. **Notificaciones**: Avisos vía email/push cuando un vehículo del usuario ingresa o sale.

## 📡 Configuración de Puertas
- **Entrada**: `ENTRADA_PRINCIPAL`
- **Salida**: `SALIDA_PRINCIPAL`
- **MQTT**: Comandos `OPEN` publicados en `parking/barrera/entrada/control` y `parking/barrera/salida/control`.
