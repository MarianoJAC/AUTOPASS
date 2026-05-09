from database import engine, SessionLocal
import models
from auth import get_password_hash
import datetime

def init_db():
    # Crear tablas
    models.Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    try:
        # 1. Crear usuario Admin si no existe
        admin_email = "admin@autopass.com"
        if not db.query(models.User).filter(models.User.email == admin_email).first():
            admin_user = models.User(
                nombre="Admin",
                apellido="Sistema",
                dni="00000000",
                telefono="00000000",
                email=admin_email,
                password_hash=get_password_hash("admin123"),
                rol="admin"
            )
            db.add(admin_user)
            print("[+] Usuario Admin creado.")

        # 2. Inicializar Aforo si no existe
        if not db.query(models.ParkingAforo).first():
            db.add(models.ParkingAforo(
                capacidad_total=20, 
                ocupacion_actual=0, 
                ultima_actualizacion=datetime.datetime.now().isoformat()
            ))
            print("[+] Aforo inicializado.")

        # 3. Inicializar Settings si no existen
        if not db.query(models.Settings).filter(models.Settings.clave == "precio_hora").first():
            db.add(models.Settings(clave="precio_hora", valor=100.0))
            print("[+] Configuración de precio inicializada.")

        db.commit()
        print("[OK] Base de datos inicializada correctamente.")
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
