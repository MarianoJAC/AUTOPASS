import sqlite3

def migrate():
    conn = sqlite3.connect('parking.db')
    cursor = conn.cursor()
    
    columns_to_add = [
        ('pago_confirmado', 'BOOLEAN DEFAULT 0'),
        ('costo_estadia', 'FLOAT DEFAULT 0.0')
    ]
    
    for col_name, col_type in columns_to_add:
        try:
            print(f"Intentando añadir columna {col_name}...")
            cursor.execute(f"ALTER TABLE access_logs ADD COLUMN {col_name} {col_type}")
            print(f"Columna {col_name} añadida.")
        except sqlite3.OperationalError:
            print(f"La columna {col_name} ya existe.")
            
    conn.commit()
    conn.close()
    print("Migración finalizada.")

if __name__ == "__main__":
    migrate()
