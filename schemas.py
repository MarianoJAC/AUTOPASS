from pydantic import BaseModel
from typing import Optional, List

class PlateValidation(BaseModel):
    plate: str
    gate_id: str
    image_base64: Optional[str] = None

class AccessResponse(BaseModel):
    status: str
    action: str
    message: str

class ParkingStatus(BaseModel):
    capacidad_total: int
    ocupacion_actual: int
    disponibilidad: int

class UserBase(BaseModel):
    nombre: str
    email: str

class UserCreate(UserBase):
    password: str

class ReservationCreate(BaseModel):
    user_id: int
    patente: str
    start_time: str
    duration_hours: int
    coupon_code: Optional[str] = None
