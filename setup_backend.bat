@echo off
title Setup Backend - AUTOPASS Professional v3.1
echo ======================================================
echo   INSTALACION DEL ENTORNO PROFESIONAL (AUTOPASS)
echo ======================================================
echo.

:: 1. Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado o no se encuentra en el PATH.
    echo Por favor, instala Python 3.9 o superior.
    pause
    exit /b
)

:: 2. Crear entorno virtual
echo [+] Creando entorno virtual (venv)...
if not exist venv (
    python -m venv venv
) else (
    echo [!] El entorno venv ya existe, saltando creacion.
)

if %errorlevel% neq 0 (
    echo [ERROR] No se pudo crear el entorno virtual.
    pause
    exit /b
)

:: 3. Activar entorno e instalar dependencias
echo [+] Activando entorno virtual e instalando librerias...
call venv\Scripts\activate

echo [+] Actualizando PIP...
python -m pip install --upgrade pip

echo [+] Instalando FastAPI, Jinja2 y Base de Datos...
pip install fastapi uvicorn sqlalchemy python-dotenv jinja2 passlib[bcrypt] python-jose[cryptography]

echo [+] Instalando Comunicacion (MQTT y Requests)...
pip install paho-mqtt requests

echo [+] Instalando Vision Artificial (ALPR)...
echo Nota: La instalacion de EasyOCR puede tardar unos minutos.
pip install opencv-python easyocr

:: 4. Configurar Variables de Entorno (.env)
echo [+] Configurando archivo de variables de entorno (.env)...
if not exist .env (
    echo # --- SEGURIDAD JWT --- > .env
    echo SECRET_KEY=autopass_super_secret_key_2026_pro >> .env
    echo ALGORITHM=HS256 >> .env
    echo ACCESS_TOKEN_EXPIRE_MINUTES=1440 >> .env
    echo. >> .env
    echo # --- BASE DE DATOS --- >> .env
    echo DATABASE_URL=sqlite:///./parking.db >> .env
    echo. >> .env
    echo # --- BROKER MQTT --- >> .env
    echo MQTT_BROKER=broker.hivemq.com >> .env
    echo MQTT_PORT=1883 >> .env
    echo MQTT_TOPIC_ENTRADA=parking/barrera/entrada/control >> .env
    echo MQTT_TOPIC_SALIDA=parking/barrera/salida/control >> .env
    echo. >> .env
    echo # --- DIRECTORIOS --- >> .env
    echo IMAGE_DIR=captured_images >> .env
    echo STATIC_DIR=static >> .env
    echo TEMPLATES_DIR=templates >> .env
    echo [OK] Archivo .env creado con valores por defecto.
) else (
    echo [!] El archivo .env ya existe, preservando configuracion actual.
)

:: 5. Inicializar Base de Datos
echo.
echo [+] Inicializando Base de Datos y Usuario Admin...
python init_db.py

echo.
echo ======================================================
echo   INSTALACION COMPLETADA CON EXITO (v3.1)
echo ======================================================
echo.
echo Arquitectura Profesional:
echo - Backend Modular (Routers)
echo - Frontend Engine (Jinja2)
echo - Business Logic (Service Pattern)
echo.
echo Credenciales de Admin por defecto:
echo Email: admin@autopass.com
echo Pass: admin123
echo.
echo Para iniciar el sistema:
echo 1. Activa el entorno: call venv\Scripts\activate
echo 2. Corre el server: uvicorn main:app --reload
echo.
echo Acceso Web: http://localhost:8000
echo.
pause
