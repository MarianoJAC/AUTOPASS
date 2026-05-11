@echo off
title Server - AUTOPASS Professional
echo ======================================================
echo   EJECUTANDO SERVIDOR AUTOPASS (FASTAPI)
echo ======================================================
echo.

:: Verificar si el entorno virtual existe
if not exist venv (
    echo [ERROR] No se encontro el entorno virtual 'venv'.
    echo Por favor, ejecuta primero setup_backend.bat
    pause
    exit /b
)

:: Activar el entorno virtual
echo [+] Activando entorno virtual...
call venv\Scripts\activate

:: Ejecutar el servidor
echo [+] Iniciando Uvicorn en http://localhost:8000
echo [+] (Presiona Ctrl+C para detener el servidor)
echo.
uvicorn main:app --reload

pause
