# 🚀 Roadmap de Implementación: Sistema de Parking Mixto

Este documento detalla el orden cronológico y técnico para construir e integrar el sistema completo.

---

## 🏗️ Fase 1: El Cerebro (Backend & Aforo)
*Objetivo: Crear el motor que gestiona el inventario virtual.*

1.  **Configuración del Entorno**: Servidor Node.js + SQLite.
2.  **Lógica de Aforo**: Desarrollar el algoritmo de (Entradas - Salidas) e integración con el esquema de reservas por patente.
3.  **Módulo ALPR (Simulación)**: Script Python que lee el stream del celular y reconoce caracteres.
4.  **Broker MQTT**: Configurar Mosquitto para el control de barreras.

---

## 💻 Fase 2: Control Físico (Hardware Barreras)
*Objetivo: Integrar el ESP32 con la lógica de acceso.*

1.  **Firmware de Barrera**: Lectura de sensor de presencia y actuación de servomotor.
2.  **Comunicación Dual**: ESP32 reporta presencia -> Python lee patente -> Backend ordena apertura vía MQTT.
3.  **Interfaz Local**: Mensajes en LCD I2C sobre cupos disponibles.

---

## 📱 Fase 3: Experiencia Digital (App & Web)
*Objetivo: Visualizar el aforo y permitir reservas.*

1.  **Dashboard Web**: Mapa de "Inventario Lógico" y contador de aforo real-time.
2.  **App Móvil**: Flujo de reserva vinculando la patente del vehículo.
3.  **Módulo de Reportes**: Análisis de rotación de vehículos basado en patentes.

---

## 🔌 Fase 4: El Control Físico (Hardware ESP32)
*Objetivo: Detectar vehículos y controlar el acceso real.*

1.  **Firmware de Sensor**: Programar el ESP32 para leer el HC-SR04 y publicar el estado vía MQTT a `parking/spots/[ID]/status`.
2.  **Firmware de Acceso**: Configurar el lector RFID/QR para que haga una petición `POST` a `/access/validate`.
3.  **Actuación de Barrera**: Control del servomotor SG90 según la respuesta del servidor (200 OK = Abrir).
4.  **Interfaz Local**: Mostrar mensajes en la pantalla LCD (ej: "Bienvenido Juan - Plaza A-03").

---

## 🔗 Fase 5: Integración Total y Pruebas (QA)
*Objetivo: Asegurar que todo el flujo funcione sin errores.*

1.  **Prueba de Flujo Completo**: 
    - Reservar en la App -> Ver la plaza "Azul" en el Web.
    - Simular llegada con QR -> El ESP32 abre la barrera -> El Web registra "Ingreso".
    - El sensor detecta ocupación -> La plaza pasa a "Rojo" en el Web y la App.
2.  **Manejo de Excepciones**: ¿Qué pasa si el WiFi se cae? ¿Qué pasa si alguien estaciona en una plaza que no le corresponde? (Alertas en el Dashboard).
3.  **Optimización**: Pulir tiempos de respuesta y consumo de batería de la App.

---

## 📅 Estimación de Tiempos (MVP)
- **Fase 1 & 2**: 2 semanas.
- **Fase 3**: 2 semanas.
- **Fase 4**: 1-2 semanas.
- **Fase 5 (Ajustes)**: 1 semana.
*Total estimado: 6-7 semanas para un prototipo funcional de alta fidelidad.*
