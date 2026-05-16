import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# --- CONFIGURACIÓN DE BASE DE DATOS ---
# Se prioriza la variable de entorno para entornos de producción (PostgreSQL/MySQL)
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./parking.db")

# Creación del motor de base de datos
# check_same_thread es requerido solo por SQLite para manejo de hilos concurrentes
engine_args = {"check_same_thread": False} if SQLALCHEMY_DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=engine_args)

# Fábrica de sesiones para interactuar con la base de datos
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Clase base para la definición de modelos ORM
Base = declarative_base()

def get_db():
    """Dependencia para inyectar la sesión de DB en los endpoints de FastAPI."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Sincroniza y crea las tablas definidas en los modelos si no existen."""
    import models
    Base.metadata.create_all(bind=engine)
