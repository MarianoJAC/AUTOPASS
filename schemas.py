from pydantic import BaseModel, field_validator
from typing import Optional, List
import re

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
    puntos_acumulados: Optional[int] = 0
    saldo: Optional[float] = 0.0

    @field_validator('telefono')
    @classmethod
    def validate_telefono(cls, v):
        if not v.isdigit() or len(v) < 10:
            raise ValueError('El teléfono debe contener código de área y número (mínimo 10 dígitos)')
        return v

class UserUpdate(BaseModel):
    nombre: Optional[str] = None
    apellido: Optional[str] = None
    telefono: Optional[str] = None
    email: Optional[str] = None
    direccion: Optional[str] = None

class UserCreate(UserBase):
    password: str

    @field_validator('dni')
    @classmethod
    def validate_dni(cls, v):
        if not v.isdigit():
            raise ValueError('El DNI debe contener únicamente números (sin puntos)')
        return v

    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('La contraseña debe tener al menos 8 caracteres')
        if not re.search(r"[A-Z]", v):
            raise ValueError('La contraseña debe tener al menos una mayúscula')
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", v):
            raise ValueError('La contraseña debe tener al menos un carácter especial')
        return v

class UserLogin(BaseModel):
    email: str
    password: str

class UserChangePassword(BaseModel):
    old_password: str
    new_password: str

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
    sucursal_nombre: Optional[str] = "AUTOPASS Central"
    tipo_estadia: Optional[str] = "hora"
    dias_semana: Optional[str] = None

class AdminReservationCreate(BaseModel):
    user_id: Optional[int] = None
    cliente_nombre: Optional[str] = ""
    patente: str
    fecha_inicio: str
    fecha_fin: str
    sucursal_nombre: Optional[str] = "AUTOPASS Ituzaingó"
    tipo_estadia: Optional[str] = "hora"

class ReservationUpdate(BaseModel):
    fecha_inicio: Optional[str] = None
    fecha_fin: Optional[str] = None
    patente: Optional[str] = None

class UserReservationResponse(BaseModel):
    id: int
    user_id: int
    user_name: str = ""
    user_email: str = ""
    patente: str
    fecha_inicio: str
    fecha_fin: str
    estado_pago: str
    estado_reserva: str
    monto_total: float
    tipo_estadia: Optional[str] = "hora"
    sucursal_nombre: Optional[str] = None
    sucursal_info: Optional[str] = None
    cliente_nombre: Optional[str] = ""

    class Config:
        from_attributes = True
