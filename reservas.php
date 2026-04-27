<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTOPASS - RESERVAS</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Inter:wght@300;400&display=swap');

        :root {
            --azul-abismo: #101820;
            --dorado-noble: #C5A059;
            --blanco: #FFFFFF;
        }

        body {
            margin: 0;
            padding: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background-color: #000;
            font-family: 'Inter', sans-serif;
            color: var(--blanco);
        }

        .ContenedorReservas {
            width: 90%;
            max-width: 400px;
            background-color: var(--azul-abismo);
            padding: 30px;
            border-radius: 15px;
            border: 1px solid var(--dorado-noble);
            display: flex;
            flex-direction: column;
            gap: 25px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.8);
        }

        .LogoReservas {
            max-width: 200px;
            height: auto;
            margin: 0 auto 10px;
            display: block;
        }

        .TituloReservas {
            font-family: 'Montserrat', sans-serif;
            color: var(--dorado-noble);
            font-size: 1.2rem;
            text-align: center;
            letter-spacing: 2px;
            text-transform: uppercase;
            margin: 0;
        }

        .GrupoInput {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        .EtiquetaInput {
            font-size: 0.8rem;
            color: var(--dorado-noble);
            letter-spacing: 1px;
            font-weight: bold;
            text-transform: uppercase;
        }

        input {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(197, 160, 89, 0.3);
            padding: 15px;
            border-radius: 8px;
            color: var(--blanco);
            font-size: 1rem;
            outline: none;
            transition: all 0.3s ease;
        }

        input:focus {
            border-color: var(--dorado-noble);
            background: rgba(255, 255, 255, 0.1);
        }

        .BotonConfirmar {
            margin-top: 10px;
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

        .BotonConfirmar:hover {
            transform: scale(1.02);
            box-shadow: 0 0 20px rgba(224, 150, 79, 0.4);
        }

        .LinkVolver {
            text-align: center;
            color: var(--dorado-noble);
            text-decoration: none;
            font-size: 0.8rem;
            font-weight: bold;
            text-transform: uppercase;
            margin-top: 10px;
        }

    </style>
</head>
<body>

    <div class="ContenedorReservas">
        <img src="LOGOSINFONDO2-removebg-preview.png" alt="LOGO" class="LogoReservas">
        <h2 class="TituloReservas">NUEVA RESERVA</h2>

        <form style="display: flex; flex-direction: column; gap: 20px;" onsubmit="event.preventDefault(); alert('RESERVA CONFIRMADA'); window.location.href='mapa.php';">
            <div class="GrupoInput">
                <span class="EtiquetaInput">FECHA</span>
                <input type="date" required>
            </div>

            <div class="GrupoInput">
                <span class="EtiquetaInput">HORA</span>
                <input type="time" required>
            </div>

            <button type="submit" class="BotonConfirmar">CONFIRMAR RESERVA</button>
        </form>

        <a href="mapa.php" class="LinkVolver">VOLVER AL MAPA</a>
    </div>

</body>
</html>
