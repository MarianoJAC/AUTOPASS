import sqlite3
import os

def fix_database():
    db_path = 'parking.db'
    if not os.path.exists(db_path):
        print(f"[-] No se encontro {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar si la columna ya existe
        cursor.execute("PRAGMA table_info(users)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'patente' not in columns:
            print("[*] Agregando columna 'patente' a la tabla 'users'...")
            cursor.execute("ALTER TABLE users ADD COLUMN patente TEXT")
            conn.commit()
            print("[OK] Columna agregada exitosamente.")
        else:
            print("[!] La columna 'patente' ya existe.")
            
        conn.close()
    except Exception as e:
        print(f"[ERROR] No se pudo modificar la base de datos: {e}")

if __name__ == "__main__":
    fix_database()
