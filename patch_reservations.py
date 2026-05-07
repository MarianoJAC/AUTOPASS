import sqlite3
import os

db_path = "parking.db"

if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"Verificando tabla 'reservations' en {db_path}...")
    
    # Obtener columnas actuales
    cursor.execute("PRAGMA table_info(reservations)")
    columns = [col[1] for col in cursor.fetchall()]
    
    if 'tipo_estadia' not in columns:
        print("Agregando columna 'tipo_estadia'...")
        cursor.execute("ALTER TABLE reservations ADD COLUMN tipo_estadia VARCHAR")
    
    if 'sucursal_nombre' not in columns:
        print("Agregando columna 'sucursal_nombre'...")
        cursor.execute("ALTER TABLE reservations ADD COLUMN sucursal_nombre VARCHAR")
        
    if 'sucursal_info' not in columns:
        print("Agregando columna 'sucursal_info'...")
        cursor.execute("ALTER TABLE reservations ADD COLUMN sucursal_info VARCHAR")

    conn.commit()
    conn.close()
    print("Migración completada con éxito.")
else:
    print(f"Error: {db_path} no existe.")
