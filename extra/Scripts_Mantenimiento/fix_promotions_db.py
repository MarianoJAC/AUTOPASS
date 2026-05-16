import sqlite3
import os

# --- SCRIPT DE CORRECCIÓN: CATÁLOGO DE PROMOCIONES ---

def fix_promos():
    """Asegura que la tabla de promociones tenga la estructura y estados correctos."""
    db_path = 'parking.db'
    if not os.path.exists(db_path): return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Validación de existencia de columna 'activa'
        cursor.execute("PRAGMA table_info(promotions)")
        cols = [c[1] for c in cursor.fetchall()]
        
        if 'activa' not in cols:
            print("[*] Agregando columna 'activa' a la tabla 'promotions'...")
            cursor.execute("ALTER TABLE promotions ADD COLUMN activa BOOLEAN DEFAULT 1")
        
        # Normalización de estados
        print("[*] Activando todas las promociones existentes...")
        cursor.execute("UPDATE promotions SET activa = 1 WHERE activa IS NULL OR activa = 0")
        
        conn.commit()
        conn.close()
        print("[OK] Base de datos de beneficios normalizada correctamente.")
    except Exception as e:
        print(f"❌ [ERROR]: {e}")

if __name__ == "__main__":
    fix_promos()
