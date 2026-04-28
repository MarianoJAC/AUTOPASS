# Estado del Proyecto: ParkingTech (Actualizado 2026-04-28)

## 🚀 Hitos Recientes

### OCR y ALPR (Optimización)
- [x] **Consenso 2X**: Reducción de latencia en reconocimiento al requerir solo 2 lecturas idénticas (ideal para capturas desde pantallas).
- [x] **Soporte Formato Viejo**: Mejora en la normalización y pre-procesamiento para patentes argentinas de formato `AAA 123`.
- [x] **Unificación de Nomenclatura**: Puntos de acceso renombrados a `ENTRADA_PRINCIPAL` y `SALIDA_PRINCIPAL` para consistencia total en el ecosistema.

### Backend y Lógica de Negocio
- [x] **Tarifas Dinámicas**: Eliminación de valores hardcodeados. El sistema ahora calcula la deuda real basada en `precio_hora` configurable y tiempo transcurrido (mínimo 1 hora).
- [x] **Conexión MQTT Asíncrona**: El servidor inicia instantáneamente sin esperar respuesta del broker HiveMQ.
- [x] **Evidencia en Salida**: Se implementó el guardado de fotos también en el proceso de salida (`EXIT_patente_hora.jpg`).
- [x] **Robustez de API**: Corrección de Schemas Pydantic para evitar errores 500 cuando no se envía el campo `action`.

### Dashboard y Frontend
- [x] **Sincronización de Streams**: Los feeds de video ahora apuntan dinámicamente a los nuevos IDs de cámara.
- [x] **Heartbeat Mejorado**: Monitor de salud con ventana de 90 segundos y normalización de IDs.

## 🛠️ Pendientes Inmediatos (Backlog)
1. **Integración de Pagos**: Conectar el botón "Pagar" con el flujo real de Mercado Pago (actualmente es validación manual/simulada).
2. **Reportes Avanzados**: Implementar exportación a PDF de tickets de auditoría.
3. **Hardening**: Agregar autenticación JWT para el acceso al Dashboard Administrativo.

## 📡 Configuración de Puertas
- **Entrada**: `ENTRADA_PRINCIPAL`
- **Salida**: `SALIDA_PRINCIPAL`
- **MQTT**: Comandos `OPEN` publicados en `parking/barrera/entrada/control` y `parking/barrera/salida/control`.
