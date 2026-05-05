# 📋 Backlog Maestro: Sistema de Parking por Flujo (v3.1)

---

## 🏗️ Épica 1: Infraestructura y Lógica de Aforo (FastAPI)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **BE-01** | Setup inicial de FastAPI y DB SQLite con tabla `parking_aforo`. | Alta | ✅ Completado |
| **BE-02** | API: Endpoint `/access/validate-plate` para recibir datos del módulo ALPR. | Alta | ✅ Completado |
| **BE-03** | Lógica de Aforo: Script de inventario (Entradas - Salidas) y gestión de estados. | Alta | ✅ Completado |
| **BE-04** | Integración ALPR: Script Python (OpenCV/EasyOCR) con captura de imágenes. | Alta | ✅ Completado |
| **BE-05** | Configurar Broker MQTT para la comunicación con las barreras físicas. | Alta | ✅ Completado |
| **BE-06** | **Arquitectura Pro**: Modularización por Routers y Patrón de Servicios. | Alta | ✅ Completado |

---

## 🖥️ Épica 2: Dashboard Administrativo (Panel Web)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **WD-01** | Visualización de Aforo: Contador de ocupación en tiempo real en el Dashboard. | Alta | ✅ Completado |
| **WD-02** | Log de Actividad: Tabla de ingresos/egresos con visualización de fotos. | Alta | ✅ Completado |
| **WD-03** | Control Remoto: Botones de apertura manual de barreras (Entrada/Salida). | Media | ✅ Completado |
| **WD-04** | **BI Analytics**: Gráficos de recaudación (Chart.js) y filtros de calendario. | Alta | ✅ Completado |
| **WD-05** | Gestión de Campañas: CRUD para cupones de descuento y promociones. | Media | 🟦 Pendiente |

---

## 📱 Épica 3: Aplicación Móvil & Fidelidad (Ecosistema User)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **MA-01** | Setup de Expo (React Native) y configuración de navegación. | Alta | 🟦 Pendiente |
| **MA-02** | Autenticación: Registro y vinculación de patentes (Web implementado). | Alta | 🟨 En Progreso |
| **MA-03** | **Fidelización**: Lógica de puntos AutoPass (10 pts x $100). | Media | ✅ Completado |
| **MA-04** | Home & Reservas: Sincronización de aforo y creación de solicitudes. | Alta | 🟨 En Progreso |
| **MA-05** | **Pagos**: Integración real del SDK de Mercado Pago (Checkout Pro). | Alta | 🟦 Pendiente |
| **MA-06** | **Cupones**: Módulo de ingreso y validación de códigos promocionales. | Media | 🟦 Pendiente |
| **MA-07** | Notificaciones: Avisos de ingreso exitoso y recordatorios de salida. | Media | 🟦 Pendiente |

---

## ⚙️ Épica 4: Hardware IoT - Kit de Barrera (ESP32)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **HW-01** | Firmware: Publicación MQTT de eventos y simulación de sensores. | Alta | ✅ Completado |
| **HW-02** | Actuación: Suscripción a comando `OPEN` y control de barrera. | Alta | ✅ Completado |
| **HW-03** | UI Local: Mensajes en LCD I2C ("BIENVENIDO", "LLENO"). | Media | 🟦 Pendiente |
| **HW-04** | Sensor de Seguridad: Lógica anti-colisión para barrera. | Media | 🟦 Pendiente |

---

## 🛡️ Épica 5: Calidad y Seguridad (Producción)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **QA-01** | Prueba de Flujo Completo: ALPR -> Backend -> Barrera -> Pago -> Salida. | Alta | ✅ Completado |
| **QA-02** | Auditoría de Seguridad: Implementación de JWT y hashing Bcrypt. | Alta | ✅ Completado |
| **QA-03** | Configuración Pro: Centralización de secretos en archivo `.env`. | Alta | ✅ Completado |
| **QA-04** | Pruebas de Estrés: Validación de aforo con alta concurrencia. | Media | 🟦 Pendiente |

---

## 📅 Próximos Pasos Prioritarios
1. **Mercado Pago:** Conectar la lógica de servicios con la pasarela de pagos real.
2. **App Móvil:** Iniciar el desarrollo del cliente en Expo/React Native.
3. **Notificaciones:** Implementar sistema de avisos por correo o push.
