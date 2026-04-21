# 📋 Backlog Maestro: Sistema de Parking por Flujo

---

## 🏗️ Épica 1: Infraestructura y Lógica de Aforo (FastAPI)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **BE-01** | Setup inicial de FastAPI y DB SQLite con tabla `parking_aforo`. | Alta | ✅ Completado |
| **BE-02** | API: Endpoint `/access/validate-plate` para recibir datos del módulo ALPR. | Alta | ✅ Completado |
| **BE-03** | Lógica de Aforo: Script de inventario (Entradas - Salidas) y gestión de estados. | Alta | ✅ Completado |
| **BE-04** | Integración ALPR: Script Python (OpenCV/EasyOCR) con captura de imágenes. | Alta | ✅ Completado |
| **BE-05** | Configurar Broker MQTT para la comunicación con las barreras físicas. | Alta | ✅ Completado |

---

## 🖥️ Épica 2: Dashboard Administrativo (Panel Web)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **WD-01** | Visualización de Aforo: Contador de ocupación en tiempo real en el Dashboard. | Alta | ✅ Completado |
| **WD-02** | Log de Actividad: Tabla de ingresos/egresos con visualización de fotos de evidencia. | Alta | ✅ Completado |
| **WD-03** | Control Remoto: Botones de apertura manual de barreras (Entrada/Salida). | Media | ✅ Completado |
| **WD-04** | Gestión de Campañas: CRUD para cupones de descuento y promociones. | Media | 🟦 Pendiente |

---

## 📱 Épica 3: Aplicación Móvil (Experiencia Expo & Fidelidad)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **MA-01** | Setup de Expo (React Native) y configuración de navegación (Tabs/Stack). | Alta | 🟦 Pendiente |
| **MA-02** | Autenticación: Registro de usuario y vinculación de **patente principal**. | Alta | 🟦 Pendiente |
| **MA-03** | Home: Sincronización del contador de aforo mediante API. | Alta | 🟦 Pendiente |
| **MA-04** | Reserva: Flujo de selección de zona y tiempo de estancia. | Alta | 🟦 Pendiente |
| **MA-05** | **Pagos**: Integración del SDK de Mercado Pago (Checkout Pro). | Alta | 🟦 Pendiente |
| **MA-06** | **Fidelización**: Pantalla de canje de puntos por beneficios (1h gratis, etc.). | Media | 🟦 Pendiente |
| **MA-07** | **Cupones**: Módulo de ingreso y validación de códigos promocionales. | Media | 🟦 Pendiente |
| **MA-08** | Notificaciones: Avisos de ingreso exitoso y recordatorios de salida. | Media | 🟦 Pendiente |
| **MA-09** | Contingencia: Generador de QR dinámico (Plan B para ALPR). | Baja | 🟦 Pendiente |

---

## ⚙️ Épica 4: Hardware IoT - Kit de Barrera (ESP32)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **HW-01** | Firmware: Publicación MQTT de eventos y simulación de sensores. | Alta | ✅ Completado |
| **HW-02** | Actuación: Suscripción a comando `OPEN` y control de barrera. | Alta | ✅ Completado |
| **HW-03** | UI Local: Mensajes en LCD I2C ("BIENVENIDO [Patente]", "LLENO"). | Media | 🟦 Pendiente |
| **HW-04** | Sensor de Seguridad: Lógica para evitar que la barrera baje si hay un auto debajo. | Media | 🟦 Pendiente |

---

## 🛡️ Épica 5: Calidad e Seguridad (Producción)

| ID | Tarea / Historia de Usuario | Prioridad | Estado |
| :--- | :--- | :--- | :--- |
| **QA-01** | Prueba de Flujo Completo: ALPR reconoce -> Backend valida -> Abre barrera -> Pago -> Salida. | Alta | 🟨 En Progreso |
| **QA-02** | Pruebas de Estrés: Validación del contador de aforo con múltiples entradas. | Media | 🟦 Pendiente |
| **QA-03** | Auditoría de Seguridad: Implementación de JWT y cifrado de contraseñas. | Alta | 🟦 Pendiente |

---

## 📅 Próximos Pasos
1. **Seguridad:** Implementar protección JWT para los endpoints y el Dashboard.
2. **App Móvil:** Iniciar el desarrollo del cliente en Expo.
3. **Pagos:** Integrar la lógica de Mercado Pago en el flujo de salida.
