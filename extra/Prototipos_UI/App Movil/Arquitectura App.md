# 📱 Arquitectura de la App Móvil: ParkingTech

Este documento define la estructura técnica y el stack tecnológico de la aplicación móvil para usuarios.

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Razón |
| :--- | :--- | :--- |
| **Framework** | **Expo (React Native)** | Desarrollo ágil, multiplataforma y excelente gestión de librerías. |
| **Lenguaje** | **TypeScript** | Para asegurar un código robusto y evitar errores de tipos en los datos de reserva. |
| **Gestión de Estado** | **Zustand** o **Context API** | Ligero y eficiente para manejar la patente activa y el estado del usuario. |
| **Navegación** | **React Navigation** | El estándar para navegación nativa (Tabs, Stack). |
| **Estilos** | **NativeWind (Tailwind CSS)** | Permite un diseño rápido, moderno y responsivo. |
| **Comunicación API** | **Axios** | Cliente HTTP robusto para conectar con el backend en FastAPI. |
| **Pagos** | **Mercado Pago SDK** | Integración nativa para pagos seguros en Latinoamérica. |

## 🏗️ Estructura del Proyecto (Carpetas)

```text
/src
  /api          # Configuraciones de Axios y llamadas a FastAPI
  /components   # Componentes reutilizables (Botones, Tarjetas de patente)
  /context      # Proveedores de estado (Auth, ParkingContext)
  /screens      # Pantallas principales (Home, Reserve, Profile, Coupons)
  /hooks        # Lógica reutilizable (useAforo, useReservations)
  /utils        # Formateadores de fecha, validadores de patente
```

## 📡 Flujo de Comunicación

1. **Sincronización de Aforo**:
   - La App abre un canal de **WebSockets** con el servidor FastAPI al iniciar.
   - Cada vez que una barrera detecta un auto, el servidor envía un mensaje "update_aforo" y la App actualiza el contador visual instantáneamente.

2. **Proceso de Pago**:
   - Al confirmar la reserva, la App solicita una `Preference ID` al Backend.
   - Se abre el modal de **Mercado Pago**.
   - Tras el pago exitoso, la App recibe el callback y habilita la patente en el sistema ALPR.

3. **Acceso ALPR**:
   - No requiere acción del usuario en la App. El Backend vincula la `patente` registrada con el `ID` de la reserva activa.

## 🔒 Seguridad
- **Autenticación**: JWT (JSON Web Tokens) almacenados de forma segura mediante `Expo Secure Store`.
- **Validación**: La patente se valida con una expresión regular antes de permitir el registro.
