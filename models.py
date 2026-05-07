from sqlalchemy import Column, Integer, String, Float, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String)
    apellido = Column(String)
    dni = Column(String, unique=True, index=True)
    telefono = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    rol = Column(String, default="user") # 'admin' o 'user'
    direccion = Column(String, nullable=True)
    puntos_acumulados = Column(Integer, default=0)
    saldo = Column(Float, default=0.0)

    vehicles = relationship("Vehicle", back_populates="owner")
    reservations = relationship("Reservation", back_populates="user")
    points_logs = relationship("PointsLog", back_populates="user")

class Vehicle(Base):
    __tablename__ = "vehicles"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    patente = Column(String, unique=True, index=True)
    marca_modelo = Column(String)

    owner = relationship("User", back_populates="vehicles")

class Reservation(Base):
    __tablename__ = "reservations"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    patente = Column(String)
    fecha_inicio = Column(String)
    fecha_fin = Column(String)
    dias_semana = Column(String, nullable=True) # Almacena "0,1,2" (0=Lunes, etc.)
    monto_total = Column(Float)
    mp_preference_id = Column(String, nullable=True)
    estado_pago = Column(String, default="Pendiente")
    estado_reserva = Column(String, default="Pendiente")
    sucursal_nombre = Column(String, nullable=True)
    sucursal_info = Column(String, nullable=True)

    user = relationship("User", back_populates="reservations")
    access_logs = relationship("AccessLog", back_populates="reservation")

class ParkingAforo(Base):
    __tablename__ = "parking_aforo"
    id = Column(Integer, primary_key=True, index=True)
    capacidad_total = Column(Integer, default=20)
    ocupacion_actual = Column(Integer, default=0)
    ultima_actualizacion = Column(String)

class PointsLog(Base):
    __tablename__ = "points_log"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    cantidad = Column(Integer)
    motivo = Column(String)
    fecha = Column(String)

    user = relationship("User", back_populates="points_logs")

class Coupon(Base):
    __tablename__ = "coupons"
    id = Column(Integer, primary_key=True, index=True)
    codigo = Column(String, unique=True, index=True)
    descuento_porcentaje = Column(Integer)
    fecha_expiracion = Column(String)
    activo = Column(Boolean, default=True)

class Settings(Base):
    __tablename__ = "settings"
    id = Column(Integer, primary_key=True, index=True)
    clave = Column(String, unique=True)
    valor = Column(Float)

class AccessLog(Base):
    __tablename__ = "access_logs"
    id = Column(Integer, primary_key=True, index=True)
    patente_detectada = Column(String)
    tipo_evento = Column(String) # 'ENTRADA' o 'SALIDA'
    reserva_id = Column(Integer, ForeignKey("reservations.id"), nullable=True)
    fecha_hora = Column(String)
    imagen_path = Column(String, nullable=True)
    pago_confirmado = Column(Boolean, default=False)
    costo_estadia = Column(Float, default=0.0)

    reservation = relationship("Reservation", back_populates="access_logs")
