import os
import json
import datetime
from fastapi import FastAPI, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
import paho.mqtt.client as mqtt
from paho.mqtt.enums import CallbackAPIVersion
from dotenv import load_dotenv

import models, auth, database
from database import engine

# Importación de Routers Modularizados
from routes import parking, reports, system, admin, user, auth as auth_router_mod

load_dotenv()

# --- CONFIGURACIÓN DE LA APLICACIÓN ---
app = FastAPI(title="AUTOPASS Professional API", version="4.5.0")
templates = Jinja2Templates(directory="templates")

# Directorio para almacenamiento de imágenes capturadas por ALPR
IMAGE_DIR = "captured_images"
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

# Montaje de archivos estáticos y multimedia
app.mount("/images", StaticFiles(directory=IMAGE_DIR), name="images")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Configuración de CORS para permitir peticiones desde el frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- CONFIGURACIÓN DE COMUNICACIÓN IOT (MQTT) ---
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

mqtt_client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2)
app.mqtt_client = mqtt_client # Inyección para acceso global desde los routers

@app.on_event("startup")
def startup_event():
    """Inicialización de servicios al arrancar el servidor."""
    try:
        mqtt_client.connect_async(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        # Inicialización de esquemas de base de datos
        models.Base.metadata.create_all(bind=engine)
    except Exception as e: 
        print(f"Error en fase de inicio (MQTT/DB): {e}")

# --- REGISTRO DE RUTAS (API) ---
app.include_router(auth_router_mod)
app.include_router(parking)
app.include_router(reports)
app.include_router(system)
app.include_router(admin)
app.include_router(user)

# --- SERVIDO DE PLANTILLAS JINJA2 (FRONTEND) ---
@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="dashboard.html")

@app.get("/perfil", response_class=HTMLResponse)
async def get_perfil(request: Request):
    return templates.TemplateResponse(request=request, name="perfil.html")

@app.get("/nuestra-red", response_class=HTMLResponse)
async def get_nuestra_red(request: Request):
    return templates.TemplateResponse(request=request, name="nuestra-red.html")

@app.get("/contacto", response_class=HTMLResponse)
async def get_contacto(request: Request):
    return templates.TemplateResponse(request=request, name="contacto.html")

@app.get("/terminos", response_class=HTMLResponse)
async def get_terminos(request: Request):
    return templates.TemplateResponse(request=request, name="terminos.html")

@app.get("/privacidad", response_class=HTMLResponse)
async def get_privacidad(request: Request):
    return templates.TemplateResponse(request=request, name="privacidad.html")
