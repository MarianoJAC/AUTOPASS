# 🚀 Guía de Despliegue (Deployment) - ParkingTech

Este documento describe los pasos para desplegar el sistema completo en un entorno de producción.

## 🏗️ 1. Arquitectura de Despliegue

```text
[ Hardware: ESP32 ] --(MQTT/TLS)--> [ Cloud MQTT Broker ]
                                           |
                                           v
[ Frontend: Vercel ] <--(HTTPS/WSS)-- [ Backend: Docker ] <--> [ DB: PostgreSQL ]
```

## 🐳 2. Contenerización del Backend (Docker)

Para asegurar que el backend y la base de datos funcionen en cualquier servidor, se utiliza `docker-compose`.

### Archivo `docker-compose.yml` (Sugerido)
```yaml
version: '3.8'
services:
  db:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASS}
      POSTGRES_DB: parking_db
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgres://${DB_USER}:${DB_PASS}@db:5432/parking_db
      MQTT_BROKER_URL: ${MQTT_URL}
      JWT_SECRET: ${JWT_SECRET}
    ports:
      - "3000:3000"
    depends_on:
      - db
```

## 📡 3. Configuración del Broker MQTT

Para producción, no uses Mosquitto local. Se recomiendan servicios gestionados:
- **HiveMQ Cloud** (Gratis hasta 100 dispositivos).
- **AWS IoT Core**.
- **EMQX Cloud**.

**Requisito de Seguridad**: Habilitar **TLS/SSL (Puerto 8883)** para que las comunicaciones entre el ESP32 y el servidor estén cifradas.

## 💻 4. Hosting del Frontend

El frontend (React/Angular) debe desplegarse en servicios optimizados para aplicaciones estáticas (SPA):
1. **Vercel / Netlify**: Conexión directa con el repositorio de GitHub para despliegue automático (CI/CD).
2. **Variables de Entorno**: Configurar `REACT_APP_API_URL` apuntando a la IP/Dominio de tu servidor Backend.

## 🔐 5. Variables de Entorno (Producción)

Crea un archivo `.env` en el servidor con los siguientes valores reales:
```env
# Database
DB_USER=admin_parking
DB_PASS=una_clave_muy_segura

# MQTT
MQTT_URL=mqtts://tu-instancia.hivemq.cloud:8883
MQTT_USER=esp32_device
MQTT_PASS=clave_mqtt_segura

# Security
JWT_SECRET=f3b0c1... (generar con openssl rand -hex 32)
```

## 🛠️ 6. Pasos para el Despliegue Final

1. **Servidor (VPS)**: Instalar Docker y Docker Compose.
2. **Clonar Repo**: `git clone <repo_url>`.
3. **Lanzar Servicios**: `docker-compose up -d`.
4. **Firmware**: Actualizar el código del ESP32 con la URL del Broker de producción y las credenciales WiFi del parking.
5. **Dominio**: Configurar un proxy inverso (como Nginx o Caddy) para habilitar HTTPS en el Backend.
