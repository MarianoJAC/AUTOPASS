<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AUTOPASS - MAPA INTERACTIVO</title>
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
            height: 100vh;
            background-color: #000;
            font-family: 'Inter', sans-serif;
            color: var(--blanco);
        }

        .HeaderMapa {
            padding: 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: var(--azul-abismo);
            border-bottom: 2px solid var(--dorado-noble);
            z-index: 10;
        }

        .LogoHeader {
            max-height: 40px;
        }

        .TituloHeader {
            font-family: 'Montserrat', sans-serif;
            font-size: 1rem;
            color: var(--dorado-noble);
            letter-spacing: 2px;
            text-transform: uppercase;
        }

        .ContenedorMapa {
            flex-grow: 1;
            position: relative;
            background-color: #000; /* FONDO NEGRO PARA EVITAR DESTELLO BLANCO */
        }

        iframe {
            width: 100%;
            height: 100%;
            border: none;
            filter: grayscale(100%) invert(92%) contrast(83%); /* FILTRO PARA MODO OSCURO */
        }

        .BotonReserva {
            position: absolute;
            bottom: 40px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 30px;
            background: linear-gradient(135deg, #B35C32, #E0964F);
            color: #000;
            text-decoration: none;
            font-weight: bold;
            border-radius: 50px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.5);
            text-transform: uppercase;
            letter-spacing: 1px;
            transition: all 0.3s ease;
            z-index: 20;
        }

        .BotonReserva:hover {
            transform: translateX(-50%) scale(1.05);
            box-shadow: 0 8px 20px rgba(224, 150, 79, 0.4);
        }

    </style>
</head>
<body>

    <header class="HeaderMapa">
        <img src="LOGOSINFONDO2-removebg-preview.png" alt="LOGO" class="LogoHeader">
        <div class="TituloHeader">ESTACIONAMIENTOS CERCANOS</div>
        <a href="login.php" style="color: var(--dorado-noble); text-decoration: none; font-size: 0.8rem; font-weight: bold;">SALIR</a>
    </header>

    <div class="ContenedorMapa">
        <!-- MAPA INTERACTIVO DE GOOGLE CENTRADO EN MORON PARK -->
        <iframe 
            src="https://maps.google.com/maps?q=-34.6510007,-58.6252822&z=17&output=embed" 
            allowfullscreen="" 
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade">
        </iframe>

        <a href="reservas.php" class="BotonReserva">HACER UNA RESERVA</a>
    </div>

</body>
</html>
