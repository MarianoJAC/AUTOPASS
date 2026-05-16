import sqlite3

# --- SCRIPT DE MIGRACIÓN: ACTUALIZACIÓN DE ESQUEMA ---

def migrate():
    """Actualiza la estructura de la base de datos para soportar nuevas funcionalidades."""
    conn = sqlite3.connect('parking.db')
    cursor = conn.cursor()
    
    # Nuevas columnas para Access Logs
    columns_access = [
        ('pago_confirmado', 'BOOLEAN DEFAULT 0'),
        ('costo_estadia', 'FLOAT DEFAULT 0.0')
    ]
    
    # Nuevas columnas para Usuarios
    columns_users = [
        ('saldo', 'FLOAT DEFAULT 0.0')
    ]
    
    # Nuevas columnas para Reservas
    columns_reservations = [
        ('sucursal_nombre', 'TEXT'),
        ('sucursal_info', 'TEXT')
    ]
    
    def add_cols(table, cols):
        """Intenta agregar columnas de forma segura a una tabla existente."""
        for col_name, col_type in cols:
            try:
                print(f"[*] Intentando añadir columna '{col_name}' a '{table}'...")
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}")
                print(f"[+] Columna '{col_name}' añadida con éxito.")
            except sqlite3.OperationalError:
                print(f"[!] La columna '{col_name}' ya se encuentra presente en '{table}'.")

    add_cols('access_logs', columns_access)
    add_cols('users', columns_users)
    add_cols('reservations', columns_reservations)
            
    conn.commit()
    conn.close()
    print("\n[OK] El proceso de migración ha finalizado.")

if __name__ == "__main__":
    migrate()
