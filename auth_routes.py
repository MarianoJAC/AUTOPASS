import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/v1/auth", tags=["Authentication"])

@router.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    from routes.parking import normalize_name, normalize_dni
    # Verificar si el email ya existe
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Email ya registrado")
    
    # Hashear contraseña
    hashed_password = auth.get_password_hash(user.password)
    
    # Crear nuevo usuario con datos normalizados
    new_user = models.User(
        nombre=normalize_name(user.nombre),
        apellido=normalize_name(user.apellido),
        dni=normalize_dni(user.dni),
        telefono=user.telefono,
        email=user.email.lower().strip(),
        password_hash=hashed_password,
        rol="user" # Rol por defecto
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return {"status": "ok", "message": "Usuario registrado exitosamente"}

@router.post("/login")
def login(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    user = auth.authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Email o contraseña incorrectos",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = datetime.timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email, "rol": user.rol}, 
        expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token, 
        "token_type": "bearer", 
        "rol": user.rol,
        "nombre": user.nombre,
        "apellido": user.apellido
    }
