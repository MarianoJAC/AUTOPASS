<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTOPASS - REGISTRO</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Inter:wght@300;400&display=swap');

        :root {
            --azul-abismo: #101820;
            --dorado-noble: #C5A059;
            --violeta: #483D8B;
            --blanco: #FFFFFF;
        }

        body {
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            min-height: 100vh;
            background-color: #000;
            font-family: 'Inter', sans-serif;
            color: var(--blanco);
            padding-bottom: 40px;
        }

        .LogoRegistro {
            max-width: 250px;
            height: auto;
            margin: 40px 0;
        }

        .ContenedorFormulario {
            width: 90%;
            max-width: 500px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }

        .TituloRegistro {
            font-family: 'Montserrat', sans-serif;
            color: var(--dorado-noble);
            font-size: 1.5rem;
            text-align: center;
            letter-spacing: 2px;
            margin-bottom: 20px;
            text-transform: uppercase;
        }

        .FilaInputs {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }

        .GrupoInput {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .EtiquetaInput {
            font-size: 0.7rem;
            color: var(--dorado-noble);
            letter-spacing: 1px;
            font-weight: bold;
            text-transform: uppercase;
        }

        input {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(197, 160, 89, 0.2);
            padding: 12px;
            border-radius: 8px;
            color: var(--blanco);
            font-size: 0.9rem;
            outline: none;
            transition: all 0.3s ease;
            text-transform: uppercase;
        }

        input:focus {
            border-color: var(--dorado-noble);
            background: rgba(255, 255, 255, 0.08);
            box-shadow: 0 0 10px rgba(197, 160, 89, 0.1);
        }

        .BotonRegistrar {
            margin-top: 30px;
            padding: 15px;
            border-radius: 8px;
            border: none;
            background: linear-gradient(135deg, #B35C32, #E0964F);
            color: #000;
            font-weight: bold;
            font-size: 1rem;
            cursor: pointer;
            transition: all 0.3s ease;
            text-transform: uppercase;
        }

        .BotonRegistrar:hover {
            transform: scale(1.02);
            box-shadow: 0 0 15px rgba(224, 150, 79, 0.4);
        }

        .LinkVolver {
            text-align: center;
            margin-top: 20px;
            color: var(--dorado-noble);
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
        }

    </style>
</head>
<body>

    <img src="LOGOSINFONDO2-removebg-preview.png" alt="LOGO" class="LogoRegistro">

    <div class="ContenedorFormulario">
        <h2 class="TituloRegistro">REGISTRO DE USUARIO</h2>
        
        <form class="FormularioLogin" onsubmit="event.preventDefault(); alert('REGISTRO SIMULADO EXITOSO'); window.location.href='login.php';">
            <div class="FilaInputs">
                <div class="GrupoInput">
                    <span class="EtiquetaInput">NOMBRE</span>
                    <input type="text" placeholder="NOMBRE" required>
                </div>
                <div class="GrupoInput">
                    <span class="EtiquetaInput">APELLIDO</span>
                    <input type="text" placeholder="APELLIDO" required>
                </div>
            </div>

            <div class="FilaInputs">
                <div class="GrupoInput">
                    <span class="EtiquetaInput">DNI</span>
                    <input type="text" placeholder="DNI" required>
                </div>
                <div class="GrupoInput">
                    <span class="EtiquetaInput">TELEFONO</span>
                    <input type="tel" placeholder="TELEFONO" required>
                </div>
            </div>

            <div class="GrupoInput">
                <span class="EtiquetaInput">MAIL</span>
                <input type="email" placeholder="CORREO ELECTRONICO" style="text-transform: none;" required>
            </div>

            <div class="GrupoInput">
                <span class="EtiquetaInput">PATENTE DEL VEHICULO</span>
                <input type="text" placeholder="ABC-123" required>
            </div>

            <div class="GrupoInput">
                <span class="EtiquetaInput">DIRECCION</span>
                <input type="text" placeholder="CALLE, NUMERO, CIUDAD" required>
            </div>

            <div class="GrupoInput">
                <span class="EtiquetaInput">CONTRASENA DE ACCESO</span>
                <input type="password" placeholder="********" required>
            </div>

            <button type="submit" class="BotonRegistrar">REGISTRARSE</button>
        </form>

        <a href="login.php" class="LinkVolver">VOLVER AL LOGIN</a>
    </div>

</body>
</html>
