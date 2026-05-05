# 🧠 MEMORIA DE SESIÓN: PROYECTO AUTOPASS

**Fecha:** 4 de Mayo de 2026  
**Rama de Trabajo:** `diego`

## 🎯 OBJETIVOS CUMPLIDOS

### 1. Identidad de Marca y Tono
*   **Manual de Marca:** Se creó `APLICACION/MANUAL_MARCA.md` definiendo la paleta de colores técnica (#101820, #C5A059, #483D8B) y la tipografía (Montserrat/Inter).
*   **Voz y Tono:** Se estableció una comunicación **CERCANA y AFECTUOSA** usando el **voseo argentino**. 
*   **Ajustes de UI:** 
    *   Cambiado "NO TIENES CUENTA? REGISTRATE AQUI" por "**¿NO TENES CUENTA? REGISTRATE ACA**".
    *   Cambiado botón "REGISTRARSE" por "**REGÍSTRATE**".
    *   Corrección de ortografía total en el formulario de registro (acentos y letra Ñ).

### 2. Refactorización Estructural (CSS)
*   Se eliminaron todos los bloques `<style>` de los archivos HTML.
*   Se creó la carpeta `APLICACION/estilos/` con los siguientes archivos:
    *   `login.css`, `dashboard.css`, `mapa.css`, `registro.css`, `reservas.css`, `boton_circular.css`.
*   Se vincularon correctamente mediante `<link>` manteniendo la funcionalidad intacta.

### 3. Funcionalidad y Datos
*   **Mapa Interactivo:** Actualizada la ubicación a **Moron Park** con la leyenda correspondiente en el marcador de Google Maps.
*   **Formatos de Patente:** 
    *   Nuevo estándar: `ABC123` y `AA111EE` (sin espacios).
    *   Se eliminó toda referencia a "AE114RA".
    *   Validaciones Regex en `registro.html` actualizadas para estos formatos pegados.
*   **Orden de Campos en Registro:** Nombre, Apellido, DNI, Teléfono, Patente, Mail, Contraseña y Dirección.

### 4. Estrategia de MVP
*   Definición de problema: Fricción operativa y frialdad emocional en el estacionamiento.
*   Target: Usuarios Premium que valoran su tiempo.
*   Diagrama DFD Nivel 0: Generado en código Mermaid compatible con draw.io (textos en verde y almacenes de datos).

## 🚀 PENDIENTES / PRÓXIMOS PASOS
*   Continuar con la implementación de la lógica de negocio en el Backend si es necesario.
*   Mantener la regla de "Mayúsculas y sin acentos" para elementos de UI, pero respetar la instrucción de "Acentos y Ñ" dada específicamente para el formulario de registro.

---
*Este documento permite retomar la sesión con total contexto de la visión estética y técnica de Diego.*
