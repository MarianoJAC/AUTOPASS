import sqlite3
import os

# --- SCRIPT DE CONFIGURACIÓN: SISTEMA DE PUNTOS ---

def setup_points():
    """Inicializa la infraestructura del sistema de puntos y beneficios."""
    db_path = 'parking.db'
    if not os.path.exists(db_path):
        print(f"[-] No se encontró el archivo de base de datos ({db_path})")
        return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 1. Creación de tabla de promociones
        print("[*] Creando estructura para el catálogo de beneficios...")
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
        
        # 2. Carga inicial de datos si la tabla está vacía
        cursor.execute("SELECT COUNT(*) FROM promotions")
        if cursor.fetchone()[0] == 0:
            print("[*] Cargando beneficios iniciales...")
            promos = [
                ('Día de Estacionamiento Libre', 'Canjeá tus puntos por 24hs de estacionamiento en cualquier sede.', 500, 'fas fa-calendar-star', 'Estadía'),
                ('Lavado Premium', 'Incluye lavado exterior, aspirado y encerado de tu vehículo.', 300, 'fas fa-soap', 'Servicio'),
                ('Café & Snack en Punto Ituzaingó', 'Disfrutá de un combo de cafetería mientras esperás.', 100, 'fas fa-coffee', 'Gastronomía'),
                ('Alineación y Balanceo', 'Revisión completa en nuestros talleres asociados.', 800, 'fas fa-gears', 'Mantenimiento'),
                ('Mes de Estacionamiento al 50%', 'Obtené un descuento del 50% en tu próxima estadía mensual.', 1500, 'fas fa-percent', 'Descuento')
            ]
            cursor.executemany("INSERT INTO promotions (titulo, descripcion, costo_puntos, icono, categoria) VALUES (?, ?, ?, ?, ?)", promos)
            print(f"[OK] Se insertaron {len(promos)} registros iniciales.")
        else:
            print("[!] El catálogo ya contiene datos.")

        conn.commit()
        conn.close()
        print("[FIN] Configuración del sistema de fidelización completada.")
    except Exception as e:
        print(f"❌ [ERROR] Falló la configuración de puntos: {e}")

if __name__ == "__main__":
    setup_points()
