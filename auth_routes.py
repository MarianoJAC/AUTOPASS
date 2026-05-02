from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import models, schemas, database, auth
from database import get_db
from datetime import timedelta

router = APIRouter(prefix="/v1/auth", tags=["auth"])

@router.post("/register", response_model=schemas.UserBase)
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    import re

    # 1. Validar DNI (Solo números)
    if not user.dni.isdigit():
        raise HTTPException(status_code=400, detail="El DNI debe contener únicamente números")
    
    # 2. Validar Email
    email_regex = r"^[^\s@]+@[^\s@]+\.[^\s@]+$"
    if not re.match(email_regex, user.email):
        raise HTTPException(status_code=400, detail="El formato del correo electrónico es inválido")

    # 3. Validar Teléfono (Solo números, min 10)
    if not user.telefono.isdigit() or len(user.telefono) < 10:
        raise HTTPException(status_code=400, detail="El teléfono debe tener al menos 10 dígitos numéricos")

    # 4. Validar Contraseña (Min 8, 1 Mayus, 1 Especial)
    password_regex = r"^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?\":{}|<>]).{8,}$"
    if not re.match(password_regex, user.password):
        raise HTTPException(status_code=400, detail="La contraseña no cumple con los requisitos de seguridad (mínimo 8 caracteres, una mayúscula y un carácter especial)")

    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya se encuentra registrado")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(
        nombre=user.nombre,
        apellido=user.apellido,
        dni=user.dni,
        telefono=user.telefono,
        email=user.email,
        direccion=user.direccion,
        password_hash=hashed_password,
        rol="user" # Por defecto son usuarios
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/login", response_model=schemas.Token)
def login(user_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not auth.verify_password(user_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "rol": user.rol}, expires_delta=access_token_expires
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "rol": user.rol,
        "nombre": user.nombre
    }
