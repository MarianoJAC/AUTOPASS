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
        default_settings = {
            "precio_hora": 1500.0,
            "precio_dia": 15000.0,
            "precio_semana": 70000.0,
            "precio_quincena": 120000.0,
            "precio_mes": 200000.0
        }
        for clave, valor in default_settings.items():
            if not db.query(models.Settings).filter(models.Settings.clave == clave).first():
                db.add(models.Settings(clave=clave, valor=valor))
                print(f"[+] Configuración de {clave} inicializada a {valor}.")

        db.commit()
        print("[OK] Base de datos inicializada correctamente.")
    except Exception as e:
        print(f"[ERROR] {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    init_db()
