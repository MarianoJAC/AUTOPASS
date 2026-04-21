# 📱 Requerimientos: App Móvil de Usuario (Modelo ALPR & Flujo)

Esta aplicación está enfocada en el acceso "Hands-Free" mediante reconocimiento de patentes y la gestión de beneficios de fidelidad.

## 🎯 Objetivos de la App
1. **Acceso Sin Fricción**: Eliminar la necesidad de interactuar con el celular al llegar (Apertura por Patente).
2. **Reserva de Cupo**: Garantizar un lugar en el inventario global del estacionamiento.
3. **Fidelización Activa**: Potenciar el uso del parking mediante puntos y cupones de descuento.

## ✅ Requerimientos Funcionales (RF)

### 1. Gestión de Identidad Vehicular
- **RF-01: Registro de Patente**: El usuario debe vincular su patente (matrícula) como "llave principal".
- **RF-02: Gestión de Flota**: Posibilidad de registrar múltiples vehículos bajo un mismo perfil.
- **RF-03: Validación Automática**: Sincronización de la patente con el sistema ALPR para apertura de barreras.

### 2. Dashboard y Aforo
- **RF-04: Disponibilidad en Tiempo Real**: Mostrar el conteo global de plazas libres basado en el flujo de entrada/salida.
- **RF-05: Estado de Reserva**: Confirmación visual de que la patente está autorizada para el próximo ingreso.

### 3. Sistema de Pagos y Fidelización
- **RF-06: Integración Mercado Pago**: Pago de reservas únicamente mediante el checkout de Mercado Pago.
- **RF-07: Billetera de Cupones**: Aplicación de códigos promocionales antes del pago.
- **RF-08: Programa de Puntos**: Acumulación de puntos por cada estancia y sección para canje por beneficios.

### 4. Acceso y Contingencia
- **RF-09: QR de Respaldo**: Generación de un código QR solo para casos donde el reconocimiento de patente falle.
- **RF-10: Notificaciones Push**: Avisos de reserva confirmada, pago aprobado y alertas de aforo.

## ⚙️ Requerimientos No Funcionales (RNF)
- **RNF-01: Latencia de Validación**: El sistema debe validar la patente y ordenar la apertura en < 2 segundos.
- **RNF-02: Seguridad de Pago**: No almacenar datos de tarjetas localmente; delegar todo el procesamiento a Mercado Pago.
- **RNF-03: UX Minimalista**: Proceso de reserva completable en menos de 4 clics.
- **RNF-04: Sincronización Real-Time**: El contador de aforo debe actualizarse vía WebSockets o MQTT en menos de 1 segundo tras un evento de barrera.
