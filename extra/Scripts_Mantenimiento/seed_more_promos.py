import sqlite3
import os

# --- SCRIPT DE CARGA: CATÁLOGO DE BENEFICIOS ---

def seed_more_promos():
    """Inserta promociones adicionales de alta gama en la base de datos."""
    db_path = 'parking.db'
    if not os.path.exists(db_path): return

    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Listado de nuevos beneficios premium
        promos = [
            ('Abono Semanal Premium', '7 días de estacionamiento sin límites en cualquier punto de la red.', 1200, 'fas fa-calendar-check', 'Abonos'),
            ('Voucher de Combustible', 'Canjeá por $5000 de carga en estaciones Shell asociadas.', 2500, 'fas fa-gas-pump', 'Beneficio'),
            ('Chequeo de Fluidos', 'Revisión gratuita de aceite, agua y presión de neumáticos.', 150, 'fas fa-oil-can', 'Mantenimiento'),
            ('Prioridad de Reserva', 'Acceso exclusivo a lugares VIP durante eventos masivos.', 400, 'fas fa-crown', 'VIP'),
            ('Lavado de Motor', 'Limpieza técnica profunda para el motor de tu vehículo.', 600, 'fas fa-engine', 'Servicio')
        ]
        
        cursor.executemany("INSERT INTO promotions (titulo, descripcion, costo_puntos, icono, categoria) VALUES (?, ?, ?, ?, ?)", promos)
        conn.commit()
        conn.close()
        print(f"[OK] {len(promos)} promociones adicionales insertadas en el catálogo.")
    except Exception as e:
        print(f"❌ [ERROR]: {e}")

if __name__ == "__main__":
    seed_more_promos()
