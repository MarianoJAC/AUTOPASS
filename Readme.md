# 🚗 AUTOPASS - Estacionamiento Inteligente (Professional Edition v3.5)

Solución empresarial para la gestión de estacionamientos que combina **Visión Artificial (ALPR)**, **Arquitectura Modular** y un **Frontend Premium** de alto impacto.

## 🏗️ Arquitectura del Sistema (v3.5)

El proyecto ha sido refactorizado siguiendo estándares de ingeniería de software de alto nivel:

- **Backend Modular (FastAPI + Routers)**: La lógica se divide en módulos especializados (`parking`, `reports`, `user`, `admin`, `system`) para máxima mantenibilidad.
- **Service Pattern**: La lógica de negocio (cobros, puntos AutoPass) está aislada en servicios independientes.
- **Frontend Engine (Jinja2 + Layouts)**: Sistema de herencia de plantillas que garantiza consistencia visual y reduce el código repetido.
- **Configuración Pro (.env)**: Centralización total de variables de entorno y secretos de seguridad.

## 🎨 Experiencia de Usuario de Vanguardia

- **Landing Page v4.0**: Nueva interfaz de inicio con carrusel dinámico, animaciones de parpadeo y navegación optimizada.
- **Sidebar Profesional**: Menú lateral inteligente con modos expandido/colapsado y alineación visual perfecta.
- **Business Intelligence**: Dashboard administrativo con gráficos **Chart.js** y reportes financieros detallados.

##  Características Destacadas

###  Seguridad y Control de Acceso
- **Autenticación JWT**: Flujo seguro de sesión con protección de rutas por roles.
- **Control ALPR (EasyOCR)**: Reconocimiento inteligente de patentes con validación de aforo.
- **Gestión de MQTT**: Apertura automatizada de barreras IoT.

###  Portal del Cliente
- **Mis Vehículos**: Registro y vinculación de dominios a la cuenta de usuario.
- **Historial y Deuda**: Seguimiento en tiempo real del costo de estadía.
- **Puntos AutoPass**: Sistema de fidelización por cada pago realizado.

##  Stack Tecnológico
- **Lenguaje:** Python 3.9+
- **Framework API:** FastAPI (Async)
- **Base de Datos:** SQLAlchemy + SQLite (Configurable a PostgreSQL/MySQL via .env)
- **Frontend:** Vanilla JS, CSS3 Moderno, Jinja2, Chart.js, Flatpickr.
- **Comunicación IoT:** Paho-MQTT.
- **IA:** OpenCV + EasyOCR.

---
*AUTOPASS: La evolución de la movilidad urbana.*
