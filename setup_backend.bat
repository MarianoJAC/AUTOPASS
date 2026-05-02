@echo off
title Setup Backend - AUTOPASS Smart Parking
echo ======================================================
echo   INSTALACION DEL ENTORNO DE DESARROLLO (AUTOPASS)
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

echo [+] Instalando FastAPI, Seguridad y Base de Datos...
pip install fastapi uvicorn sqlalchemy python-dotenv passlib[bcrypt] python-jose[cryptography]

echo [+] Instalando Comunicacion (MQTT y Requests)...
pip install paho-mqtt requests

echo [+] Instalando Vision Artificial (ALPR)...
echo Nota: La instalacion de EasyOCR puede tardar unos minutos.
pip install opencv-python easyocr

:: 4. Inicializar Base de Datos
echo.
echo [+] Inicializando Base de Datos y Usuario Admin...
python init_db.py

echo.
echo ======================================================
echo   INSTALACION COMPLETADA CON EXITO
echo ======================================================
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
