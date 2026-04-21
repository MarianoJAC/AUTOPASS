# 🛠️ Funcionalidades Principales: Smart-Parking Mixto (Modelo por Flujo)

Este documento detalla el conjunto de herramientas y capacidades que componen el ecosistema del sistema, dividido por plataforma.

---

## 📱 1. Aplicación Móvil (Experiencia del Usuario)
Diseñada para ofrecer autonomía y rapidez al conductor antes y durante su estancia.

### 🔑 Gestión de Perfil
- **Registro y Autenticación**: Acceso mediante email o redes sociales con seguridad JWT.
- **Garaje Virtual**: Registro de múltiples vehículos vinculando marca, modelo y número de patente (matrícula).
- **Billetera Digital**: Gestión de métodos de pago integrada exclusivamente con **Mercado Pago**.

### 📅 Sistema de Reservas
- **Estado de Aforo**: Visualización en tiempo real del porcentaje de ocupación y plazas disponibles antes de reservar.
- **Reserva de Cupo**: Selección de fecha, hora de llegada y duración para asegurar un lugar en el inventario global.
- **Identidad por Patente**: Vinculación automática de la reserva a la matrícula del vehículo para acceso "Hands-Free" (ALPR).
- **Preferencia de Zona**: Opción de elegir sectores sugeridos (ej: "Cerca de salida", "Techado") para recibir guía al ingresar.
- **Calculadora de Tarifas**: Estimación del costo total basada en la duración y descuentos aplicados.

### 🚧 Control de Acceso y Estancia
- **Reconocimiento de Patente**: Apertura automática de barrera al ser detectado por la cámara del sistema.
- **QR de Respaldo**: Generación de un código QR único para validación manual si el reconocimiento de patente falla.
- **Estado de Estancia Activa**: Cronómetro en vivo que muestra el tiempo transcurrido o restante.

### 🎁 Sistema de Promociones (Fidelización)
- **Canje de Cupones**: Aplicación de códigos promocionales para descuentos instantáneos en la reserva.
- **Programa de Puntos**: Acumulación de puntos por cada estancia, canjeables por tiempo gratuito o beneficios.
- **Alianzas Comerciales**: Visualización de beneficios en locales cercanos al presentar el ticket digital activo.

---

## 💻 2. Panel Web (Gestión Administrativa)
Orientado a la supervisión operativa, mantenimiento técnico y análisis financiero.

### 📊 Monitoreo de Aforo y Flujo
- **Dashboard de Aforo Vivo**: Contador dinámico (Entradas vs Salidas) que muestra la disponibilidad real del parking.
- **Log de Accesos ALPR**: Registro histórico de patentes capturadas, imágenes de detección y estados de validación.
- **Telemetría de Barreras**: Indicador de estado (Online/Offline) de los kits de barrera ESP32.

### 📈 Analítica y Negocio
- **Dashboard de Ingresos**: Gráficos interactivos de recaudación vinculados a pagos de Mercado Pago.
- **Métricas de Rotación**: Reportes sobre horas pico y tiempo promedio de estancia por patente.
- **Gestión de Campañas**: Creación y edición de cupones y reglas de puntos de fidelidad.

### ⚙️ Administración del Sistema
- **Control de Inventario**: Ajuste manual del contador de aforo (ej: para reservar plazas por mantenimiento).
- **Apertura Remota**: Botones de emergencia para abrir o cerrar las barreras desde el dashboard.
- **Base de Datos Centralizada**: Consulta de perfiles de usuarios y sus patentes vinculadas.

---

## 🔌 3. Intersección: La Conexión Física (Hardware & AI)
El puente tecnológico entre el mundo físico y digital:

- **Visión Artificial (ALPR)**: Procesamiento de imágenes en tiempo real para identificar patentes y autorizar accesos.
- **Validación Dual**: Soporte para entrada por patente (principal) y QR/Manual (contingencia).
- **Guía Visual Local**: Pantalla LCD en la entrada que comunica mensajes dinámicos ("Bienvenido [Nombre]", "Parking Lleno", "Pase al Sector A").
- **Conteo por Barreras**: Sensores de presencia que aseguran la actualización del aforo global con cada vehículo que cruza el acceso.
