import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import models, schemas, auth
from database import get_db

router = APIRouter(prefix="/v1/auth", tags=["Authentication"])

@router.post("/register")
def register(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """Procesa el registro de un nuevo usuario con datos normalizados."""
    from routes.parking import normalize_name, normalize_dni
    
    # Verificación de duplicidad de correo
    db_user = db.query(models.User).filter(models.User.email == user.email).first()
    if db_user:
        raise HTTPException(status_code=400, detail="El correo electrónico ya se encuentra registrado")
    
    # Creación de usuario con hash de seguridad
    new_user = models.User(
        nombre=normalize_name(user.nombre),
        apellido=normalize_name(user.apellido),
        dni=normalize_dni(user.dni),
        telefono=user.telefono,
        email=user.email.lower().strip(),
        password_hash=auth.get_password_hash(user.password),
        rol="user"
    )
    
    db.add(new_user)
    db.commit()
    return {"status": "ok", "message": "Usuario registrado exitosamente"}

@router.post("/login")
def login(form_data: schemas.UserLogin, db: Session = Depends(get_db)):
    """Autentica al usuario y retorna un token JWT de acceso."""
    user = auth.authenticate_user(db, form_data.email, form_data.password)
    if not user:
        raise HTTPException(
            status_code=401,
            detail="Credenciales inválidas. Verificá tu correo y contraseña.",
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
