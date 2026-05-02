# 💻 Diseño Web: Panel de Control Administrativo

Este panel está diseñado para ser la central de monitoreo y gestión del estacionamiento, optimizado para uso en escritorio (Desktop).

## 🎯 Objetivos del Dashboard
1. **Monitoreo en Vivo**: Visualizar el estado de cada plaza (libre/ocupada/reservada) en tiempo real.
2. **Gestión de Tickets**: Consultar, validar y emitir comprobantes de ingreso y pago (PDF/Impresión).
3. **Control de Acceso**: Ver quién entra y sale, con alertas de QR inválidos o excedentes de tiempo.
4. **Analítica de Negocio**: Reportes de ocupación y facturación diaria/mensual.

---

### 2. Pantalla de Tickets y Facturación
```text
+-------------------------------------------------------------+
| [LOGO] Buscar Ticket #...   [Filtros: Hoy/Semana] [Admin JP]|
|-------------------------------------------------------------|
| [ Mapa ]      | LISTADO DE TICKETS RECIENTES:               |
| [ Tickets* ]  | [ ID ] [ PATENTE ] [ INGRESO ] [ ESTADO ]   |
| [ Usuarios ]  | [#8821] [AB 123 CD] [13:50]   [PENDIENTE]   |
| [ Reportes ]  | [#8820] [XY 999 ZZ] [10:15]   [PAGADO]      |
|               |                                             |
| [ VER DETALLE DEL TICKET SELECCIONADO ]                     |
| - Tiempo Transcurrido: 1h 25m                               |
| - Subtotal: $450.00                                         |
| [ BOTÓN: COBRAR EFECTIVO ] [ BOTÓN: IMPRIMIR DUPLICADO ]    |
+-------------------------------------------------------------+
```


## 📐 Estructura de la Interfaz (Layout)
- **Sidebar (Lateral)**: Navegación entre Mapa, Reservas, Usuarios, Reportes y Configuración.
- **Top Bar**: Buscador de patentes, notificaciones de sistema y perfil del administrador.
- **Main Content**: Área dinámica que cambia según la sección seleccionada.

---

## 🎨 Elementos Visuales (UI)
- **Mapa Interactivo**: Grilla de plazas con código de colores dinámico:
  - 🟩 **Verde**: Plaza libre.
  - 🟥 **Rojo**: Plaza ocupada físicamente (sensor detectó vehículo).
  - 🟦 **Azul**: Plaza reservada (a la espera del usuario).
  - ⚠️ **Naranja**: Alerta (ej: Vehículo ocupando plaza sin reserva o tiempo excedido).

- **Kpis (Indicadores Clave)**:
  - Ocupación Actual (%).
  - Ingresos del Día ($).
  - Reservas Próximas (n).
  - Tiempo Promedio de Estancia.

---

## 📱 Pantallas Principales (Wireframes)

### 1. Dashboard Principal (Mapa + Stats)
```text
+-------------------------------------------------------------+
| [LOGO] Search Patente...   [Alerts(2)] [Admin JP]           |
|-------------------------------------------------------------|
| [ Mapa ]      | [ OCUPACIÓN: 75% ]  [ INGRESOS: $12.500 ]   |
| [ Reservas ]  |                                             |
| [ Usuarios ]  | +-----------------------------------------+ |
| [ Reportes ]  | | [A1] [A2] [A3] [A4] |  [B1] [B2] [B3] [B4]| |
| [ Config ]    | | [A5] [A6] [A7] [A8] |  [B5] [B6] [B7] [B8]| |
|               | +-----------------------------------------+ |
|               |                                             |
| [LOG OUT]     | ÚLTIMA ACTIVIDAD:                           |
|               | - QR #10293 Validado (Plaza A-03) - 14:15hs |
|               | - Salida Vehículo AB 123 CD - 14:05hs       |
+-------------------------------------------------------------+
```
