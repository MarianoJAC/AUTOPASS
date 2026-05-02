# 🚗 AUTOPASS - Estacionamiento Inteligente Integrado

Solución empresarial para la gestión de estacionamientos que combina **Visión Artificial (ALPR)**, **Autenticación JWT** y un **Ecosistema Web Completo** para administradores y clientes.

## 🌟 Características Destacadas

### 🔐 Seguridad y Control de Acceso
- **Autenticación JWT**: Flujo seguro de login y registro con protección de rutas por roles (Admin/Usuario).
- **Control ALPR (EasyOCR)**: Reconocimiento automático de patentes con validación de aforo y reservas.
- **Auditoría Visual**: Captura de imágenes en cada evento de entrada y salida, vinculadas al perfil del usuario.

### 📱 Experiencia del Usuario (Portal Cliente)
- **Panel Personalizado**: Visualización de vehículos registrados y deuda actual en tiempo real.
- **Reservas Digitales**: Posibilidad de reservar lugar por fecha y hora para asegurar disponibilidad.
- **Notificaciones**: Estado de estadía actualizado mediante WebSockets/Pooling.

### 🖥️ Gestión Administrativa (Dashboard Pro)
- **Monitor en Vivo**: Visualización de cámaras y últimos movimientos con tecnología de streaming asíncrono.
- **Analíticas Financieras**: Reportes de recaudación, ticket promedio y estadísticas de ocupación.
- **Gestión de Usuarios**: Listado completo de la base de clientes y sus datos de contacto (DNI, Teléfono).
- **Configuración Dinámica**: Ajuste de tarifas y control manual de barreras vía MQTT.

## 🛠️ Tecnologías Utilizadas
- **Backend:** FastAPI (Python), SQLAlchemy, Paho-MQTT.
- **Frontend:** Vanilla JS, CSS3 Modern (Glassmorphism), Jinja2 (vía FastAPI).
- **IA/Visión:** OpenCV, EasyOCR.
- **Seguridad:** JWT (JSON Web Tokens), Bcrypt Hashing.
- **Base de Datos:** SQLite (Persistente).

---
*Desarrollado para la evolución de la movilidad urbana y la automatización de predios.*
