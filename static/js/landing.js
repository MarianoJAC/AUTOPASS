// --- LÓGICA ESPECÍFICA DE LA LANDING PAGE Y PÁGINAS PÚBLICAS ---

// --- MENÚ MÓVIL ---
function toggleMobileMenu() {
    const nav = document.getElementById('nav-menu');
    const btnIcon = document.querySelector('.mobile-menu-btn i');
    if (nav) {
        const isActive = nav.classList.toggle('active');
        if (btnIcon) {
            btnIcon.className = isActive ? 'fas fa-xmark' : 'fas fa-bars';
        }
        
        // Cerrar menú al hacer clic en un enlace
        if (isActive) {
            const navLinks = nav.querySelectorAll('a');
            navLinks.forEach(link => {
                link.onclick = () => {
                    nav.classList.remove('active');
                    if (btnIcon) btnIcon.className = 'fas fa-bars';
                };
            });
        }
    }
}

// --- LÓGICA DEL CARRUSEL DE INICIO ---
const DatosCarrusel = [
    { imagen: '/static/images/INICIO/trafico1.webp', leyenda: '¿Te agota tanto embotellamiento en Buenos Aires?' },
    { imagen: '/static/images/INICIO/trafico2.webp', leyenda: '¿Sentís que el tráfico continuo te consume la energía?' },
    { imagen: '/static/images/INICIO/trafico3.webp', leyenda: '¿Es frustrante perder horas en la autopista?' },
    { imagen: '/static/images/INICIO/estacionamiento1.webp', leyenda: '¿Te fastidia buscar lugar en la calle siempre?' },
    { imagen: '/static/images/INICIO/estacionamiento2.webp', leyenda: '¿Te molesta llegar y que no haya lugar?' },
    { imagen: '/static/images/INICIO/estacionamiento3.webp', leyenda: 'AUTOPASS elimina el estres del estacionamiento en la ciudad.' },
    { imagen: '/static/images/INICIO/estacionamiento4.webp', leyenda: 'Reserva tu cochera online en segundos con AUTOPASS.' }
];

let IndiceCarruselActual = 0;
let IntervaloCarrusel = null;

function InicializarCarrusel() {
    const Contenedor = document.getElementById('contenedorCarrusel');
    if (!Contenedor) return;

    // GENERAR ITEMS
    DatosCarrusel.forEach((dato, i) => {
        const Item = document.createElement('div');
        Item.className = `item-carrusel ${i === 0 ? 'activo' : ''}`;
        Item.style.backgroundImage = `url('${dato.imagen}')`;
        Item.innerHTML = `<div class="leyenda-carrusel">${dato.leyenda}</div>`;
        Contenedor.appendChild(Item);
    });

    IniciarTemporizadorCarrusel();
}

function IniciarTemporizadorCarrusel() {
    if (IntervaloCarrusel) clearInterval(IntervaloCarrusel);
    IntervaloCarrusel = setInterval(() => RotarCarrusel(1), 5000);
}

function RotarCarrusel(Direccion) {
    const Items = document.querySelectorAll('.item-carrusel');
    if (Items.length === 0) return;

    Items[IndiceCarruselActual].classList.remove('activo');
    IndiceCarruselActual += Direccion;
    
    if (IndiceCarruselActual >= Items.length) IndiceCarruselActual = 0;
    if (IndiceCarruselActual < 0) IndiceCarruselActual = Items.length - 1;
    
    Items[IndiceCarruselActual].classList.add('activo');
}

function MoverCarrusel(Direccion) {
    RotarCarrusel(Direccion);
    IniciarTemporizadorCarrusel();
}

function irAReserva() {
    if (localStorage.getItem('token')) {
        window.location.href = '/perfil';
    } else {
        openModal('registerModal');
    }
}

// --- LÓGICA DEL MAPA ---
function initMap() {
    const mapEl = document.getElementById('map');
    if (!mapEl) return;

    const hqCoords = [-34.5888, -58.3900];
    const map = L.map('map').setView(hqCoords, 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap',
        subdomains: 'abcd',
        maxZoom: 20
    }).addTo(map);

    const goldIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: #C5A059; width: 15px; height: 15px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px #C5A059;"></div>`,
        iconSize: [15, 15],
        iconAnchor: [7, 7]
    });

    L.marker(hqCoords, { icon: goldIcon }).addTo(map).bindPopup('<b>AUTOPASS HQ</b><br>Av. del Libertador 1200, CABA').openPopup();

    const points = [
        { name: "AUTOPASS Ituzaingó", coords: [-34.6585, -58.6685], desc: "Punto de Acceso Estación Ituzaingó" },
        { name: "AUTOPASS Castelar", coords: [-34.6485, -58.6350], desc: "Centro Comercial Castelar" },
        { name: "AUTOPASS Morón", coords: [-34.6508, -58.6228], desc: "San Martín - Morón" }
    ];

    points.forEach(p => {
        const branchIcon = L.divIcon({
            className: 'branch-icon',
            html: `<div style="background-color: #C5A059; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 8px #C5A059;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
        });
        L.marker(p.coords, { icon: branchIcon }).addTo(map).bindPopup(`<b>${p.name}</b><br>${p.desc}`);
    });
}

// Inicialización automática para páginas públicas
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('map')) initMap();
    if (document.getElementById('contenedorCarrusel')) InicializarCarrusel();
});
