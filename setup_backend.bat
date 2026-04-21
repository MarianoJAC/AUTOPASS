@echo off
title Setup Backend - Smart Parking ALPR
echo ======================================================
echo   INSTALACION DEL ENTORNO DE DESARROLLO (FASTAPI + AI)
echo ======================================================
echo.

:: 1. Verificar si Python está instalado
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python no esta instalado o no se encuentra en el PATH.
    echo Por favor, instala Python 3.10 o superior desde python.org
    pause
    exit /b
)

:: 2. Crear entorno virtual
echo [+] Creando entorno virtual (venv)...
python -m venv venv
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

echo [+] Instalando FastAPI y Servidor...
pip install fastapi uvicorn sqlalchemy python-dotenv

echo [+] Instalando Comunicacion (MQTT y Requests)...
pip install paho-mqtt requests

echo [+] Instalando Vision Artificial (ALPR)...
echo Nota: La primera instalacion de EasyOCR puede tardar unos minutos.
pip install opencv-python easyocr

echo.
echo ======================================================
echo   INSTALACION COMPLETADA CON EXITO
echo ======================================================
echo.
echo Para iniciar el servidor:
echo 1. Activa el entorno: call venv\Scripts\activate
echo 2. Corre el server: uvicorn main:app --reload
echo.
pause
