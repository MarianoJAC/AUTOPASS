from pydantic import BaseModel
from typing import Optional, List

class PlateValidation(BaseModel):
    plate: str
    gate_id: str
    image_base64: Optional[str] = None

class AccessResponse(BaseModel):
    status: str
    action: Optional[str] = None
    message: str

class ParkingStatus(BaseModel):
    capacidad_total: int
    ocupacion_actual: int
    disponibilidad: int

class UserBase(BaseModel):
    nombre: str
    apellido: str
    dni: str
    telefono: str
    email: str
    direccion: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    rol: str
    nombre: str

class ReservationCreate(BaseModel):
    user_id: int
    patente: str
    start_time: str
    duration_hours: int
    coupon_code: Optional[str] = None

class AdminReservationCreate(BaseModel):
    patente: str
    fecha_inicio: str
    fecha_fin: str
    dias_semana: Optional[str] = None # Ej: "0,2,4"
    monto_total: float = 0.0

class UserReservationCreate(BaseModel):
    patente: str
    fecha_inicio: str
    fecha_fin: str

class UserReservationResponse(BaseModel):
    id: int
    patente: str
    fecha_inicio: str
    fecha_fin: str
    estado_pago: str
    estado_reserva: str
    monto_total: float

    class Config:
        from_attributes = True
