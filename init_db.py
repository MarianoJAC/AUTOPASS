from database import SessionLocal, init_db as create_tables
import models
from auth import get_password_hash
import datetime

# --- INICIALIZACIÓN DE DATOS BASE ---

def populate_initial_data():
    """
    Crea las tablas de la base de datos e inserta los registros iniciales 
    necesarios para el funcionamiento del sistema.
    """
    # 1. Crear tablas si no existen
    create_tables()
    
    db = SessionLocal()
    try:
        # 2. Crear usuario Administrador predeterminado
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
            print("[+] Usuario Administrador creado.")

        # 3. Inicializar registro de Aforo (Capacidad del predio)
        if not db.query(models.ParkingAforo).first():
            db.add(models.ParkingAforo(
                capacidad_total=20, 
                ocupacion_actual=0, 
                ultima_actualizacion=datetime.datetime.now().isoformat()
            ))
            print("[+] Registro de aforo inicializado.")

        # 4. Inicializar tarifas predeterminadas (Settings)
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
                print(f"[+] Configuración de {clave} establecida en ${valor}.")

        db.commit()
        print("\n[OK] Base de datos configurada y lista para operar.")
    except Exception as e:
        print(f"❌ [ERROR] Falló la inicialización: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    populate_initial_data()
