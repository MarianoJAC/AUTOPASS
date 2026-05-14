# Estado del Proyecto: ParkingTech (Actualizado 2026-05-14)

### 🚀 Hitos Recientes (Mayo 2026)
- [x] **Responsive Design Full**: Menú hamburguesa pro, cabecera móvil centrada y adaptación total de la flota.
- [x] **Pase Digital con QR**: Generación dinámica de vouchers premium compartibles vía Web Share API.
- [x] **Gestión de Saldo Pre-pago**: Implementación de recarga de saldo manual a gusto desde el perfil (vía modal premium).
- [x] **Sistema de Puntos Robusto**: Corrección integral de acumulación en pagos diferidos y ajustes automáticos por modificación de reserva.
- [x] **Cierre de Ciclo de Reserva**: Automatización de estados (Pendiente -> Activa -> Completada) sincronizada con ingresos/egresos ALPR y vencimiento por tiempo.
- [x] **Filtrado de Historial**: Implementación de filtros por rango de fechas (Desde/Hasta) con paginación dinámica en el portal de cliente.
- [x] **UI/UX Polished**: Estética de puntos en dorado, barra de progreso limpia para reservas futuras y campos de filtrado optimizados.

- [x] **Canje de Puntos**: Implementación de sección dedicada en el perfil, lógica de beneficios y promociones.
- [x] **Nuevo Ratio de Puntos**: Ajuste de fidelización a 10 puntos por cada $1000 (1 pt x $100).
- [x] **Historial de Puntos**: Seguimiento detallado de ganancias y canjes en el portal de cliente.

### 🏗️ Arquitectura Professional (¡NUEVO v4.5!)
- [x] **Modularización del Backend**: Segmentación de `main.py` en 6 routers especializados (`routes/`).
- [x] **Patrón de Servicio**: Lógica de negocio (Dinero/Puntos) aislada en `BillingService`.
- [x] **Frontend Pro (Jinja2)**: Implementación de herencia de plantillas (`base.html`) para eliminar redundancia.
- [x] **Configuración Centralizada**: Gestión de secretos y entorno vía archivo `.env`.

### 📊 Analítica y Reporting
- [x] **Gráficos Dinámicos**: Integración de **Chart.js** para visualizar tendencias de recaudación en el tiempo.
- [x] **Filtrado Avanzado**: Selector de periodos (Día, Semana, Mes, Año) y rangos personalizados.
- [x] **Calendario Pro**: Integración de **Flatpickr** para una selección de fechas interactiva y moderna.

### 🎨 UI/UX & Identidad Visual
- [x] **Nueva Landing Page**: Carrusel de imágenes dinámico con leyendas y diseño hero mejorado.
- [x] **Estilo Premium Unificado**: Estética Dorado/Negro aplicada a todo el portal (Portal de Cliente y Dashboard).
- [x] **Normalización de Botones**: Estandarización de botones de acción con tipografía Montserrat 800 y estilos de bloque sólido.
- [x] **Iconografía de Alta Gama**: Integración total de **Font Awesome 6 Pro**.

### 🔐 Seguridad y Autenticación
- [x] **JWT Auth**: Implementación de tokens de seguridad para proteger la API y el Dashboard.
- [x] **Gestión de Cuenta**: Formularios de cambio de contraseña con validación de fuerza y requisitos en tiempo real.
- [x] **Validaciones Robustas**: Registro con reglas estrictas para DNI numérico y contraseñas seguras.

### ✨ Mejoras de Experiencia (v4.5)
- [x] **Modularización Frontend**: Separación de lógica en `reservas.js`, `vehicles.js` y `main.js`.
- [x] **Reserva "Un Solo Clic"**: Automatización de períodos (Semana, Quincena, Mes) con cálculo de fechas.
- [x] **Voucher Visual**: Ticket digital con QR, patente estilizada en oro/negro y botones de compartir nativos.
- [x] **Edición "In-Place" en Perfil**: Gestión de datos personales directamente en las tarjetas.
- [x] **Calculadora Dinámica**: Precios obtenidos de la DB ($1500/hora por defecto) con actualización instantánea en el formulario.

## 🛠️ Pendientes Inmediatos (Backlog)
1. **Integración Real de Pagos**: Conectar el flujo con el SDK de Mercado Pago.
2. **Notificaciones**: Avisos vía email/push cuando un vehículo del usuario ingresa o sale.

## 📡 Configuración de Puertas
- **Entrada**: `ENTRADA_PRINCIPAL`
- **Salida**: `SALIDA_PRINCIPAL`
- **MQTT**: Comandos `OPEN` publicados en `parking/barrera/entrada/control` y `parking/barrera/salida/control`.
