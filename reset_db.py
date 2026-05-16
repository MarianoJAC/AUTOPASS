from database import SessionLocal, engine
import models
import os
import shutil

# --- SCRIPT DE LIMPIEZA INTEGRAL (MANTENIMIENTO) ---

def reset_parking_system():
    """
    Elimina todos los datos dinámicos del sistema, incluyendo logs, 
    reservas, usuarios e imágenes capturadas.
    """
    db = SessionLocal()
    try:
        print("[*] Iniciando purga del sistema...")

        # 1. Eliminación de logs de acceso ALPR
        db.query(models.AccessLog).delete()
        print("[-] Historial de accesos eliminado.")

        # 2. Restablecimiento de ocupación de parking
        aforo = db.query(models.ParkingAforo).first()
        if aforo:
            aforo.ocupacion_actual = 0
            print("[-] Ocupación restablecida a cero.")
        
        # 3. Eliminación de reservas de usuarios
        db.query(models.Reservation).delete()
        print("[-] Registro de reservas vaciado.")

        # 4. Eliminación de base de usuarios y vehículos
        db.query(models.Vehicle).delete()
        db.query(models.User).delete()
        print("[-] Base de datos de usuarios y flota eliminada.")

        db.commit()

        # 5. Limpieza de almacenamiento multimedia (fotos de patentes)
        IMAGE_DIR = "captured_images"
        if os.path.exists(IMAGE_DIR):
            for filename in os.listdir(IMAGE_DIR):
                file_path = os.path.join(IMAGE_DIR, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f'[!] Error al borrar {file_path}: {e}')
            print("[-] Repositorio de imágenes vaciado.")

        print("\n[OK] El sistema ha sido reiniciado satisfactoriamente.")

    except Exception as e:
        print(f"❌ [ERROR] Falló la purga: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_parking_system()
