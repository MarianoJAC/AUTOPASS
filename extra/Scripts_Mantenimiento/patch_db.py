import sqlite3
import os

# --- PARCHE DE COMPATIBILIDAD: TABLA USUARIOS ---

def fix_database():
    """Agrega la columna de patente principal a la tabla de usuarios si no existe."""
    db_path = 'parking.db'
    if not os.path.exists(db_path):
        print(f"[-] No se encontró el archivo de base de datos ({db_path})")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificación de esquema
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'patente' not in columns:
            print("[*] Aplicando parche: Agregando columna 'patente' a la tabla 'users'...")
            cursor.execute("ALTER TABLE users ADD COLUMN patente TEXT")
            conn.commit()
            print("[OK] Esquema de usuarios actualizado.")
        else:
            print("[!] El esquema ya se encuentra actualizado.")
            
        conn.close()
    except Exception as e:
        print(f"❌ [ERROR] Falló la aplicación del parche: {e}")

if __name__ == "__main__":
    fix_database()
