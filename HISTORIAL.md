# HISTORIAL DEL PROYECTO: AUTOPASS

## 📝 REGLAS DE LENGUAJE Y ESTILO (ACTUALIZADO 2026-05-16)

1.  **TRATO DE VOS (VOSEO ARGENTINO)**: TODO EL SITIO DEBE DIRIGIRSE AL USUARIO USANDO EL "VOS" (EJ: "INICIÁ", "REGISTRATE", "CONTACTANOS", "TENÉS").
2.  **ORTOGRAFÍA Y ACENTOS**: TODAS LAS PALABRAS DEBEN ESTAR ESCRITAS CORRECTAMENTE, INCLUYENDO ACENTOS EN MAYÚSCULAS.
3.  **FORMATO DE TEXTOS EN UI**: 
    - **NOMBRES DE USUARIO**: SIEMPRE EN MAYÚSCULAS EN TODA LA INTERFAZ.
    - **LOGO**: "AUTOPASS" siempre en **DORADO** (`var(--dorado)`) en el header público.
4.  **ESTÉTICA**: GOLD & BLACK (Premium). Uso intensivo de Glassmorphism en interfaces públicas.

## 🚀 VERSIONES RECIENTES

### VERSIÓN 5.8 (2026-05-16) — REFACTOR UI & NORMALIZACIÓN
- **NORMALIZACIÓN FUENTES**: Migración total a Montserrat como fuente base del sistema.
- **ESCALA TIPOGRÁFICA**: Implementación de variables CSS para tamaños de fuente estandarizados.
- **SIDEBAR MÓVIL V2**: Ancho reducido a 260px, alineación izquierda y cambio de Uppercase a Title Case para mejor legibilidad.
- **HEADER DESKTOP**: Restauración de proporciones premium y refactorización del botón de cierre de sesión (Outline Style).
- **JS CLEANUP**: Depuración de `landing.js`, eliminación de lógica duplicada y mejora del cierre por click exterior.

### VERSIÓN 5.1 (2026-05-16) — DASHBOARD & HEADER PRO
- **HEADER LANDING REFACTORED**: Implementación de sticky header con desenfoque de fondo y detección de estado de sesión (Login/Perfil dinámico).
- **DASHBOARD ENHANCEMENTS**: 
    - Agregado saludo personalizado dinámico.
    - Nueva sección "Mi Progreso" para visualización de beneficios acumulados.
    - Grilla de "Accesos Rápidos" para navegación ágil.
- **SECURITY UX**: Implementación de "ojitos" para ver/ocultar contraseña en el perfil.
- **LOGO UNIFICATION**: Unificación de marca en dorado para todos los headers públicos.
- **SIDEBAR REFACTOR**: Reducción de ancho a 240px y corrección de responsive en colapsado.

### VERSIÓN 5.0 (2026-05-14) — RESPONSIVE FULL 2.0 & ARQUITECTURA
- **UNIFICACIÓN LEGAL**: Aplicación del header premium a Términos, Privacidad y Nuestra Red.
- **GRID ADAPTATIVO**: Rediseño de formularios de reserva y tablas de historial para 1, 2 y 3 columnas según breakpoint.
- **FOOTER INTELIGENTE**: Apilado vertical automático de acciones de pago y botones en móviles.
- **CLEANUP CSS**: Eliminación masiva de estilos inline y centralización en hojas de estilo modulares.
- **ARQUITECTURA DE CAPAS (BACKEND)**: 
    - Implementación de Capa de Servicios (`ReservationService`) y Capa de Repositorios (`UserRepository`, `ReservationRepository`).
    - Modularización de base de datos en `database.py`.
- **SISTEMA DE PUNTOS**: Lógica integral de acumulación (10 pts x $1000) y descuentos por cancelación.

### 👤 MEJORAS EN PERFIL DE USUARIO
- **REEMPLAZO DE INLINE STYLES**: ~40 atributos `style` eliminados. Toda la UI ahora usa clases CSS reutilizables.
- **PANTALLA DE INICIO**: Banner de bienvenida, tarjetas de estadísticas y trigger de reserva renovado.
- **PASE DIGITAL**: Implementación de modal premium con QR dinámico y Web Share API.

### 🛠️ DASHBOARD ADMINISTRATIVO
- **REFACTORIZACIÓN DE UI**: Eliminación de estilos inline en favor de clases dedicadas (`.cam-box`, `.health-dot`, etc.).
- **MONITOREO EN VIVO**: Detección de patentes visual con fallback y pills de estado en logs.
- **GESTIÓN ADMIN**: Nuevos endpoints para creación de reservas manuales desde la administración.

### VERSIÓN 4.5 (2026-05-12) — MODULARIZACIÓN
- **REFACTORIZACIÓN JS**: Lógica de reservas extraída a `reservas.js`.
- **FORMULARIO DE RESERVAS PRO**: Automatización de fin de estadía por periodos.
- **SIDEBAR DINÁMICO**: Logo compacto (32px) y estados `collapsed` persistentes.
- **RESPONSIVE DESIGN**: Overhaul del menú hamburguesa y adaptabilidad total en móviles.

## 📌 PRÓXIMOS PASOS
- **MERCADO PAGO**: INTEGRAR EL SDK PARA PROCESAR PAGOS REALES.
- **CANJE DE PUNTOS**: IMPLEMENTAR LA LÓGICA DE CANJE EN EL BACKEND.
- **NOTIFICACIONES**: SISTEMA DE ALERTAS POR EMAIL PARA INGRESOS Y EGRESOS.
