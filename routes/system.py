import os
import datetime
import base64
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import text
import models, auth
from database import get_db
from dotenv import load_dotenv

load_dotenv()

router = APIRouter(prefix="/v1/system", tags=["System & Health"])

# Buffer global para transmisión de video en vivo
video_feeds = {}

def get_admin_user(current_user: models.User = Depends(auth.get_current_user)):
    """Valida si el usuario actual es administrador."""
    if current_user.rol != "admin":
        raise HTTPException(status_code=403, detail="No tiene permisos de administrador")
    return current_user

@router.post("/reset")
def reset_system(db: Session = Depends(get_db), admin: models.User = Depends(get_admin_user)):
    """Restablece el sistema eliminando todos los registros dinámicos y archivos multimedia."""
    IMAGE_DIR = os.getenv("IMAGE_DIR", "captured_images")
    db.query(models.AccessLog).delete()
    aforo = db.query(models.ParkingAforo).first()
    if aforo: aforo.ocupacion_actual = 0
    db.query(models.Reservation).delete()
    db.query(models.Vehicle).delete()
    db.query(models.User).filter(models.User.rol != 'admin').delete()
    db.commit()
    
    if os.path.exists(IMAGE_DIR):
        for f in os.listdir(IMAGE_DIR): 
            try: os.unlink(os.path.join(IMAGE_DIR, f))
            except: pass
    return {"status": "ok"}

ALPR_HEARTBEATS = {}
@router.post("/heartbeat")
def alpr_heartbeat(gate_id: str):
    """Registra un pulso de vida de un servicio ALPR remoto."""
    gate_id = gate_id.strip().upper()
    ALPR_HEARTBEATS[gate_id] = datetime.datetime.now()
    return {"status": "ok"}

@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    """Retorna el estado de salud de todos los componentes críticos del sistema."""
    db_ok = True
    try: db.execute(text("SELECT 1"))
    except: db_ok = False
    
    now = datetime.datetime.now()
    alpr_status = {}
    for gate in ["ENTRADA_PRINCIPAL", "SALIDA_PRINCIPAL"]:
        status = "OFFLINE"
        if gate in ALPR_HEARTBEATS:
            if (now - ALPR_HEARTBEATS[gate]).total_seconds() < 90: status = "ONLINE"
        alpr_status[gate] = status
        
    return {"database": "ONLINE" if db_ok else "OFFLINE", "alpr": alpr_status, "api": "ONLINE"}

# --- MANEJO DE VIDEO STREAMING ---

@router.post("/update-frame/{camera_id}")
async def update_frame(camera_id: str, request: Request):
    """Recibe un nuevo frame de video codificado en base64."""
    raw_body = await request.json()
    if "image" in raw_body:
        video_feeds[camera_id] = raw_body["image"]
    return {"status": "ok"}

def gen_frames(camera_id: str):
    """Generador para transmitir frames de video en formato multipart."""
    import time
    while True:
        frame_base64 = video_feeds.get(camera_id)
        if frame_base64:
            frame_bytes = base64.b64decode(frame_base64)
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n'
                   b'Content-Length: ' + str(len(frame_bytes)).encode() + b'\r\n\r\n' + 
                   frame_bytes + b'\r\n')
        else:
            time.sleep(0.1)
            continue
        time.sleep(0.01)

@router.get("/video-feed/{camera_id}")
async def video_feed(camera_id: str):
    """Endpoint para visualización de video en tiempo real vía MJPEG."""
    return StreamingResponse(gen_frames(camera_id),
                             media_type="multipart/x-mixed-replace; boundary=frame")
