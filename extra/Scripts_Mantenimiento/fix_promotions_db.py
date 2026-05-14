import sqlite3
import os

def fix_promos():
    db_path = 'parking.db'
    if not os.path.exists(db_path): return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Verificar si la columna activa existe, si no, agregarla
        cursor.execute("PRAGMA table_info(promotions)")
        cols = [c[1] for c in cursor.fetchall()]
        
        if 'activa' not in cols:
            print("[*] Agregando columna 'activa' a 'promotions'...")
            cursor.execute("ALTER TABLE promotions ADD COLUMN activa BOOLEAN DEFAULT 1")
        
        # Asegurar que todos tengan activa = 1
        print("[*] Seteando activa = 1 para todas las promociones...")
        cursor.execute("UPDATE promotions SET activa = 1 WHERE activa IS NULL OR activa = 0")
        
        conn.commit()
        conn.close()
        print("[OK] Base de datos de promociones corregida.")
    except Exception as e:
        print(f"[ERROR]: {e}")

if __name__ == "__main__":
    fix_promos()
