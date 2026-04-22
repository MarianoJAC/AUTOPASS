from database import SessionLocal, engine
import models
import os
import shutil

def reset_parking_system():
    db = SessionLocal()
    try:
        print("[*] Iniciando limpieza del sistema...")

        # 1. Borrar logs de acceso
        db.query(models.AccessLog).delete()
        print("[-] Logs de acceso eliminados.")

        # 2. Resetear aforo
        aforo = db.query(models.ParkingAforo).first()
        if aforo:
            aforo.ocupacion_actual = 0
            print("[-] Ocupación de parking reseteada a 0.")
        
        # 3. Borrar reservas (opcional, para limpieza total)
        db.query(models.Reservation).delete()
        print("[-] Reservas eliminadas.")

        # 4. Borrar usuarios y vehículos (opcional, para limpieza total)
        db.query(models.Vehicle).delete()
        db.query(models.User).delete()
        print("[-] Usuarios y vehículos eliminados.")

        db.commit()

        # 5. Limpiar carpeta de imágenes
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
                    print(f'Error al borrar {file_path}: {e}')
            print("[-] Carpeta de imágenes vaciada.")

        print("\n[OK] Sistema limpio y listo para nuevas pruebas.")

    except Exception as e:
        print(f"[ERROR] Error durante la limpieza: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_parking_system()
