import sqlite3

def migrate():
    conn = sqlite3.connect('parking.db')
    cursor = conn.cursor()
    
    # Access Logs
    columns_access = [
        ('pago_confirmado', 'BOOLEAN DEFAULT 0'),
        ('costo_estadia', 'FLOAT DEFAULT 0.0')
    ]
    
    # Users
    columns_users = [
        ('saldo', 'FLOAT DEFAULT 0.0')
    ]
    
    # Reservations
    columns_reservations = [
        ('sucursal_nombre', 'TEXT'),
        ('sucursal_info', 'TEXT')
    ]
    
    def add_cols(table, cols):
        for col_name, col_type in cols:
            try:
                print(f"Intentando añadir columna {col_name} a {table}...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                print(f"Columna {col_name} añadida.")
            except sqlite3.OperationalError:
                print(f"La columna {col_name} ya existe en {table}.")

    add_cols('access_logs', columns_access)
    add_cols('users', columns_users)
    add_cols('reservations', columns_reservations)
            
    conn.commit()
    conn.close()
    print("Migración finalizada.")

if __name__ == "__main__":
    migrate()
