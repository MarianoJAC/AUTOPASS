import pandas as pd
import json

file_path = "Copia de Ejemplo Product Backlog_Teresa_Aguayo.xlsx"
try:
    # Leer todas las hojas para encontrar la de "Backlog Operativo"
    xl = pd.ExcelFile(file_path)
    sheet_names = xl.sheet_names
    print(f"Hojas encontradas: {sheet_names}")
    
    # Buscar una hoja que contenga "Backlog" u "Operativo"
    target_sheet = next((s for s in sheet_names if "Backlog" in s or "Operativo" in s), None)
    
    if target_sheet:
        df = pd.read_excel(file_path, sheet_name=target_sheet)
        # Mostrar las primeras filas para entender la estructura
        print(df.head(20).to_json(orient='records'))
    else:
        print("No se encontro la hoja Backlog Operativo.")
except Exception as e:
    print(f"Error: {e}")
