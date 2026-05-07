# HISTORIAL DEL PROYECTO: AUTOPASS

## 📝 REGLAS DE LENGUAJE Y ESTILO (ACTUALIZADO 2026-05-06)

1.  **TRATO DE VOS (VOSEO ARGENTINO)**: TODO EL SITIO DEBE DIRIGIRSE AL USUARIO USANDO EL "VOS" (EJ: "INICIÁ", "REGISTRATE", "CONTACTANOS", "TENÉS"). SE DEBE EVITAR EL "TU" O EL "USTED".
2.  **ORTOGRAFÍA Y ACENTOS**: TODAS LAS PALABRAS DEBEN ESTAR ESCRITAS CORRECTAMENTE, INCLUYENDO ACENTOS EN MAYÚSCULAS (EJ: "GESTIÓN", "CONFIGURACIÓN", "VÍNCULO").
3.  **FORMATO DE TEXTOS EN UI**: 
    - **CARRUSEL**: LEYENDAS EN MINÚSCULAS EXCEPTO **AUTOPASS** (MAYÚSCULAS) Y NOMBRES PROPIOS (EJ: "Buenos Aires").
    - **NOMBRES DE USUARIO**: SIEMPRE EN MAYÚSCULAS EN TODA LA INTERFAZ (SALUDOS, PERFIL, DASHBOARD).
    - **TÍTULOS SECCIONES**: RESPETAR ACENTUACIÓN Y VOSEO (EJ: "ENCONTRÁ LOS MEJORES PUNTOS").
4.  **NOMENCLATURA DE CÓDIGO**:
    - NOMBRES DE VARIABLES, FUNCIONES Y CLASES EN ESPAÑOL USANDO **PascalCase**.
    - COMENTARIOS EN CÓDIGO SIEMPRE EN ESPAÑOL, EN **MAYÚSCULAS** Y SIN ACENTOS.

## 🚀 ESTADO ACTUAL DEL TRABAJO (VERSIÓN 4.0 — 2026-05-07)

### 🏠 LANDING PAGE
- **CARRUSEL + HERO OVERLAY**: El título AUTOPASS, leyendas rotativas y botones ahora se superponen directamente sobre el carrusel de imágenes (hero overlay), eliminando la sección separada.
- **ANIMACIÓN DE LEYENDAS**: Transición de opacidad más lenta (0.8s) al cambiar entre slides.
- **FOOTER**: Logo AUTOPASS rediseñado con tipografía Montserrat dorada. Redes sociales como botones circulares con hover dorado. Copyright con "AUTOPASS" destacado.

### 👤 PERFIL DE USUARIO (PORTAL)
- **REEMPLAZO COMPLETO DE INLINE STYLES POR CLASES CSS**: ~40 atributos `style` eliminados de las templates. Toda la UI ahora usa clases reutilizables.
- **PANTALLA DE INICIO REDISEÑADA**: Banner de bienvenida con nombre del usuario, tarjetas de estadísticas (vehículos, reservas), tarjeta "RESERVAR" grande con gradiente dorado, alerta de estadía activa.
- **FIX MODALES**: Modal overlay arreglado (`.modal` faltaba en `style.css` activo).
- **PASE DIGITAL**: Agregado aviso de fallback "Si no funciona el reconocimiento de patente, usá el QR." Título cambiado a "TICKET AUTOPASS".
- **SIDEBAR**: Logo más compacto (imagen 32px, texto 1.1rem), sidebar-footer más pequeño, botón de cerrar sesión reducido.

### 🛠️ DASHBOARD ADMINISTRATIVO
- **REFACTORIZACIÓN COMPLETA**: ~25 inline styles reemplazados por clases CSS dedicadas (`.cam-box`, `.card-header`, `.grid-stats-4`, `.health-dot`, `.danger-card`, etc.).
- **MONITOREO EN VIVO MEJORADO**: Stats con íconos y colores (verde/rojo/azul/dorado). Badge "EN VIVO" con punto pulsante en cada cámara. Fallback visual cuando la señal de video no está disponible. Pills de color para eventos ENTRADA/SALIDA. Indicador de última actualización con timestamp.
- **NUEVA PESTAÑA "RESERVAS"**: Tabla de reservas activas filtrada por sucursal Ituzaingó. Formulario para crear reservas presenciales (nombre, patente, tipo, fecha/hora).
- **NUEVO ENDPOINT ADMIN**: `POST /v1/admin/reservations` para crear reservas en persona (con o sin usuario registrado).

### 🎨 CSS
- **ÚNICO STYLESHEET**: Toda la UI centralizada en `static/css/style.css` (sin archivos por página).
- **PATRÓN `.open`**: Toggles de acordeón (historial, contraseña) manejados con clases CSS en lugar de manipulación inline de maxHeight/opacidad.
- **RESPONSIVE**: Breakpoints en 1100px, 992px, 768px, 480px para todos los componentes nuevos.
- **~50 CLASES NUEVAS**: Desde `.welcome-banner` hasta `.cam-fallback`, `.fin-layout`, `.occ-deuda-paid`, etc.

### 🔧 BACKEND
- **NUEVO MODELO**: Columna `cliente_nombre` en tabla `reservations` para reservas presenciales sin usuario registrado.
- **NUEVO SCHEMA**: `AdminReservationCreate` para creación de reservas desde el dashboard.

## 📌 GUÍA PARA PRÓXIMAS SESIONES

- **MERCADO PAGO**: INTEGRAR EL SDK PARA PROCESAR PAGOS DESDE EL BOTÓN DEL PERFIL.
- **CANJE DE PUNTOS**: IMPLEMENTAR LA LÓGICA PARA QUE EL USUARIO USE SUS PUNTOS EN ESTADÍAS.
- **NOTIFICACIONES**: DESARROLLAR EL SISTEMA DE ALERTAS (EMAIL/PUSH) PARA INGRESOS Y EGRESOS.
- **CONSISTENCIA**: MANTENER EL TONO DE "VOS" Y LA ESTÉTICA DORADO/NEGRO EN CUALQUIER DESARROLLO NUEVO.

---
*DOCUMENTO ACTUALIZADO POR GEMINI CLI PARA CONTINUIDAD DEL PROYECTO.*
