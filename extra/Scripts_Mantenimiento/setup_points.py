import sqlite3
import os

def setup_points():
    db_path = 'parking.db'
    if not os.path.exists(db_path):
        print(f"[-] No se encontró {db_path}")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Crear tabla promotions
        print("[*] Creando tabla 'promotions'...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS promotions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                titulo TEXT,
                descripcion TEXT,
                costo_puntos INTEGER,
                icono TEXT,
                categoria TEXT,
                activa BOOLEAN DEFAULT 1
            )
        """)
        
        # 2. Insertar promociones de ejemplo si la tabla está vacía
        cursor.execute("SELECT COUNT(*) FROM promotions")
        if cursor.fetchone()[0] == 0:
            print("[*] Insertando promociones de ejemplo...")
            promos = [
                ('Día de Estacionamiento Libre', 'Canjeá tus puntos por 24hs de estacionamiento en cualquier sede.', 500, 'fas fa-calendar-star', 'Estadía'),
                ('Lavado Premium', 'Incluye lavado exterior, aspirado y encerado de tu vehículo.', 300, 'fas fa-soap', 'Servicio'),
                ('Café & Snack en Punto Ituzaingó', 'Disfrutá de un combo de cafetería mientras esperás.', 100, 'fas fa-coffee', 'Gastronomía'),
                ('Alineación y Balanceo', 'Revisión completa en nuestros talleres asociados.', 800, 'fas fa-gears', 'Mantenimiento'),
                ('Mes de Estacionamiento al 50%', 'Obtené un descuento del 50% en tu próxima estadía mensual.', 1500, 'fas fa-percent', 'Descuento')
            ]
            cursor.executemany("INSERT INTO promotions (titulo, descripcion, costo_puntos, icono, categoria) VALUES (?, ?, ?, ?, ?)", promos)
            print(f"[OK] {len(promos)} promociones insertadas.")
        else:
            print("[!] La tabla 'promotions' ya tiene datos.")

        conn.commit()
        conn.close()
        print("[FIN] Configuración de puntos completada.")
    except Exception as e:
        print(f"[ERROR] No se pudo configurar la base de datos: {e}")

if __name__ == "__main__":
    setup_points()
