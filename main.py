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

import models, auth, auth_routes, database
from database import engine

# Importación de Routers Modularizados
from routes import parking, reports, system, admin, user

load_dotenv()

# --- CONFIGURACIÓN DE LA APP ---
app = FastAPI(title="AUTOPASS Professional API", version="3.1.0")
templates = Jinja2Templates(directory="templates")

# Directorios de Archivos
IMAGE_DIR = "captured_images"
if not os.path.exists(IMAGE_DIR):
    os.makedirs(IMAGE_DIR)

app.mount("/images", StaticFiles(directory=IMAGE_DIR), name="images")
app.mount("/static", StaticFiles(directory="static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MQTT SETUP ---
MQTT_BROKER = os.getenv("MQTT_BROKER", "broker.hivemq.com")
MQTT_PORT = int(os.getenv("MQTT_PORT", 1883))

mqtt_client = mqtt.Client(callback_api_version=CallbackAPIVersion.VERSION2)
app.mqtt_client = mqtt_client # Inyectamos en la app para acceso desde routers

@app.on_event("startup")
def startup_event():
    try:
        mqtt_client.connect_async(MQTT_BROKER, MQTT_PORT, 60)
        mqtt_client.loop_start()
        # Crear tablas si no existen
        models.Base.metadata.create_all(bind=engine)
    except Exception as e: 
        print(f"Error en inicio (MQTT/DB): {e}")

# --- INCLUSIÓN DE ROUTERS ---
app.include_router(auth_routes.router)
app.include_router(parking)
app.include_router(reports)
app.include_router(system)
app.include_router(admin)
app.include_router(user)

# --- SERVIDO DE PÁGINAS (Frontend con Jinja2) ---
@app.get("/", response_class=HTMLResponse)
async def get_index(request: Request):
    return templates.TemplateResponse(request=request, name="index.html")

@app.get("/dashboard", response_class=HTMLResponse)
async def get_dashboard(request: Request):
    return templates.TemplateResponse(request=request, name="dashboard.html")

@app.get("/perfil", response_class=HTMLResponse)
async def get_perfil(request: Request):
    return templates.TemplateResponse(request=request, name="perfil.html")

@app.get("/contacto", response_class=HTMLResponse)
async def get_contacto(request: Request):
    return templates.TemplateResponse(request=request, name="contacto.html")
