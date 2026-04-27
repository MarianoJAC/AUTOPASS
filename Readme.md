#  Sistema de Parking Mixto (Reservas + Al Paso)

Solución integral para la gestión de estacionamientos que combina visión artificial (ALPR), comunicación MQTT y auditoría visual.

##  Características Implementadas

###  Visión Artificial & Auditoría
- **Reconocimiento ALPR**: Detección automática de patentes mediante EasyOCR.
- **Captura de Evidencia**: El sistema toma una fotografía del vehículo en el momento exacto del ingreso para auditoría visual.
- **Historial Fotográfico**: Las imágenes se almacenan en el servidor y son accesibles desde el panel de control.

###  Backend & Lógica
- **Validación Dual**: Acceso automático para reservas y registro para usuarios "Al Paso".
- **Gestión de Pagos**: Restricción de salida automatizada; la barrera solo abre si el pago ha sido confirmado.
- **Cálculo de Tarifas**: Costo basado en tiempo de estancia ($100/hora).
- **Aforo Inteligente**: Contador persistente en DB con actualización automática.

###  Administración Centralizada
- **Dashboard Integrado**: Acceso vía web para monitorear ocupación, logs y fotos en tiempo real.
- **Control Remoto**: Apertura manual de barreras y validación de pagos desde el navegador.

##  Flujo de Auditoría y Salida
1. El vehículo ingresa, el ALPR detecta la patente y **captura una foto**.
2. El administrador puede verificar la foto en el **Dashboard** para confirmar la identidad del vehículo.
3. El usuario abona en caja y el administrador confirma el pago.
4. Al llegar a la salida, el sistema verifica la patente y el estado del pago para permitir el egreso.
