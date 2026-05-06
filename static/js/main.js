const API_BASE = '/v1';
const token = localStorage.getItem('token');

// --- LÓGICA DE SIDEBAR ---
function toggleSidebar() {
    const layout = document.querySelector('.layout-with-sidebar');
    const sidebar = document.querySelector('.sidebar');
    const toggleIcon = document.querySelector('.sidebar-toggle i');
    const isCollapsed = layout.classList.toggle('collapsed');
    sidebar.classList.toggle('collapsed');
    
    if (toggleIcon) {
        toggleIcon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
    }
    
    localStorage.setItem('sidebarCollapsed', isCollapsed);
}

document.addEventListener('DOMContentLoaded', () => {
    // Restaurar estado del sidebar
    if (localStorage.getItem('sidebarCollapsed') === 'true') {
        const layout = document.querySelector('.layout-with-sidebar');
        const sidebar = document.querySelector('.sidebar');
        const toggleIcon = document.querySelector('.sidebar-toggle i');
        if (layout && sidebar) {
            layout.classList.add('collapsed');
            sidebar.classList.add('collapsed');
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-right';
        }
    }
    
    // --- CONFIGURACIÓN DEL MAPA (INDEX) ---
    const mapEl = document.getElementById('map');
    if (mapEl) initMap();

    // --- DASHBOARD / RELOJ ---
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        setInterval(() => {
            clockEl.innerText = new Date().toLocaleTimeString();
        }, 1000);
        setInterval(updateDashboard, 5000);
        updateDashboard();
        loadSettings();
        if (localStorage.getItem('rol') === 'admin') {
            loadFinance();
        }
    }

    // --- INICIALIZACIÓN DE PERFIL ---
    if (document.getElementById('user-name') && token) {
        loadProfile();
        loadVehicles();
        loadActiveStays();
        setInterval(loadActiveStays, 30000);
    }

    // --- INICIALIZACIÓN DEL CARRUSEL (HOME) ---
    if (document.getElementById('contenedorCarrusel')) {
        InicializarCarrusel();
    }
});

// --- LÓGICA DEL CARRUSEL DE INICIO ---
const DatosCarrusel = [
    { imagen: '/images/INICIO/trafico1.webp', leyenda: '¿Te agota tanto embotellamiento en Buenos Aires?' },
    { imagen: '/images/INICIO/trafico2.webp', leyenda: '¿Sentís que el tráfico continuo te consume la energía?' },
    { imagen: '/images/INICIO/trafico3.webp', leyenda: '¿Es frustrante perder horas en la autopista?' },
    { imagen: '/images/INICIO/estacionamiento1.webp', leyenda: '¿Te fastidia buscar lugar en la calle siempre?' },
    { imagen: '/images/INICIO/estacionamiento2.webp', leyenda: '¿Te molesta llegar y que no haya lugar?' },
    { imagen: '/images/INICIO/estacionamiento3.webp', leyenda: 'AUTOPASS elimina el estres del estacionamiento en la ciudad.' },
    { imagen: '/images/INICIO/estacionamiento4.webp', leyenda: 'Reserva tu cochera online en segundos con AUTOPASS.' }
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
        // ELIMINAMOS text-transform: uppercase DE LA LEYENDA EN CSS PARA RESPETAR ESTE FORMATO
        Item.innerHTML = `<div class="leyenda-carrusel">${dato.leyenda}</div>`;
        Contenedor.appendChild(Item);
    });

    // ROTACION AUTOMATICA
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
    IniciarTemporizadorCarrusel(); // REINICIAR TIEMPO PARA QUE NO SALTE JUSTO DESPUES DEL CLIC
}

// --- LÓGICA GENÉRICA DE MODALES ---
function openModal(id) { document.getElementById(id).style.display = 'block'; }
function closeModal(id) { 
    document.getElementById(id).style.display = 'none'; 
    const loginErr = document.getElementById('login-error');
    const regErr = document.getElementById('register-error');
    if (loginErr) loginErr.style.display = 'none';
    if (regErr) regErr.style.display = 'none';
}
function switchModal(oldId, newId) { closeModal(oldId); openModal(newId); }

function irAReserva() {
    if (localStorage.getItem('token')) {
        window.location.href = '/perfil';
    } else {
        openModal('loginModal');
    }
}

// --- LÓGICA DE AUTENTICACIÓN ---
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorMsg = document.getElementById('login-error');

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('rol', data.rol);
                localStorage.setItem('nombre', data.nombre);
                window.location.href = data.rol === 'admin' ? '/dashboard' : '/perfil';
            } else {
                errorMsg.innerText = data.detail || 'Error al iniciar sesión';
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            errorMsg.innerText = 'Error de conexión';
            errorMsg.style.display = 'block';
        }
    };
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const errorMsg = document.getElementById('register-error');
        errorMsg.style.display = 'none';

        const dni = document.getElementById('reg-dni').value;
        const password = document.getElementById('reg-password').value;
        const email = document.getElementById('reg-email').value;
        const telefono = document.getElementById('reg-tel').value;

        if (!/^\d+$/.test(dni)) {
            errorMsg.innerText = 'El DNI debe contener únicamente números (sin puntos)';
            errorMsg.style.display = 'block';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMsg.innerText = 'Ingresá un correo electrónico válido';
            errorMsg.style.display = 'block';
            return;
        }

        if (!/^\d{10,}$/.test(telefono)) {
            errorMsg.innerText = 'El teléfono debe contener código de área y número (mínimo 10 dígitos)';
            errorMsg.style.display = 'block';
            return;
        }
        
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
            errorMsg.innerText = 'La contraseña debe tener al menos 8 caracteres, una mayúscula y un carácter especial';
            errorMsg.style.display = 'block';
            return;
        }

        const payload = {
            nombre: document.getElementById('reg-nombre').value,
            apellido: document.getElementById('reg-apellido').value,
            dni: dni,
            telefono: telefono,
            email: email,
            password: password
        };

        try {
            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                alert('Registro exitoso. Ahora puede iniciar sesión.');
                switchModal('registerModal', 'loginModal');
            } else {
                const data = await res.json();
                errorMsg.innerText = data.detail || 'Error en el registro';
                errorMsg.style.display = 'block';
            }
        } catch (err) {
            errorMsg.innerText = 'Error de conexión';
            errorMsg.style.display = 'block';
        }
    };
}

function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// --- LÓGICA DEL MAPA ---
function initMap() {
    const hqCoords = [-34.5888, -58.3900];
    const map = L.map('map').setView(hqCoords, 14);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
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

// --- LÓGICA DEL DASHBOARD DE ADMINISTRACIÓN ---
function switchTab(tab, el) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
    const tabEl = document.getElementById(`tab-${tab}`);
    if (tabEl) tabEl.classList.add('active');
    document.getElementById('view-title').innerText = el.innerText;
    if (tab === 'users') loadUsers();
    if (tab === 'finance') loadFinance();
}

async function updateDashboard() {
    if (!document.getElementById('stat-free')) return;
    try {
        const resStatus = await fetch(`${API_BASE}/parking/status`);
        const status = await resStatus.json();
        document.getElementById('stat-free').innerText = status.disponibilidad;
        document.getElementById('stat-occupied').innerText = status.ocupacion_actual;

        const resLogs = await fetch(`${API_BASE}/access/logs`, { headers: {'Authorization': `Bearer ${token}`} });
        const logs = await resLogs.json();
        const tbody = document.getElementById('live-logs');
        if (tbody && Array.isArray(logs)) {
            tbody.innerHTML = '';
            logs.slice(0, 8).forEach(l => {
                const time = l.fecha_hora.split('T')[1].substring(0, 8);
                tbody.innerHTML += `
                    <tr>
                        <td>${time}</td>
                        <td><span class="plate-tag gold">${l.patente_detectada}</span></td>
                        <td><span class="status-pill" style="background: ${l.tipo_evento === 'ENTRADA' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; color: ${l.tipo_evento === 'ENTRADA' ? 'var(--secondary)' : 'var(--danger)'}">${l.tipo_evento}</span></td>
                        <td><span style="color: var(--secondary)">● ACTIVO</span></td>
                    </tr>`;
            });
        }

        if (Array.isArray(logs)) {
            const lastIn = logs.find(l => l.tipo_evento === 'ENTRADA');
            const lastOut = logs.find(l => l.tipo_evento === 'SALIDA');
            if (lastIn && document.getElementById('plate-entry')) document.getElementById('plate-entry').innerText = lastIn.patente_detectada;
            if (lastOut && document.getElementById('plate-exit')) document.getElementById('plate-exit').innerText = lastOut.patente_detectada;
        }

        const resOcc = await fetch(`${API_BASE}/parking/current-occupancy`);
        const occ = await resOcc.json();
        const occBody = document.getElementById('occ-list');
        if (occBody && Array.isArray(occ)) {
            occBody.innerHTML = '';
            occ.forEach(o => {
                occBody.innerHTML += `
                    <tr>
                        <td><span class="plate-tag gold">${o.patente}</span></td>
                        <td>${o.ingreso.split('T')[1].substring(0, 5)}</td>
                        <td>CALC...</td>
                        <td style="font-weight: 800; color: ${o.ya_pago ? 'var(--secondary)' : 'var(--danger)'}">$${o.deuda}</td>
                        <td>${!o.ya_pago ? `<button class="btn btn-primary" style="padding: 5px 12px; font-size: 0.7rem" onclick="pay('${o.patente}')">COBRAR</button>` : 'PAGO OK'}</td>
                    </tr>`;
            });
        }

        const resHealth = await fetch(`${API_BASE}/system/health`);
        const health = await resHealth.json();
        const healthDb = document.getElementById('health-db');
        if (healthDb) healthDb.style.background = health.database === 'ONLINE' ? 'var(--secondary)' : 'var(--danger)';

    } catch (e) { console.error("Dashboard update failed:", e); }
}

async function loadUsers() {
    const res = await fetch(`${API_BASE}/admin/users`, { headers: {'Authorization': `Bearer ${token}`} });
    const users = await res.json();
    const body = document.getElementById('user-list');
    if (!body || !Array.isArray(users)) return;
    body.innerHTML = '';
    users.forEach(u => {
        body.innerHTML += `
            <tr>
                <td>${u.nombre} ${u.apellido}</td>
                <td>${u.email}</td>
                <td>${u.dni}</td>
                <td><span class="status-pill" style="background: rgba(255,255,255,0.05); color: #888">${u.rol}</span></td>
                <td>---</td>
            </tr>`;
    });
}

let revenueChartInstance = null;
let datePickerInstance = null;

async function loadFinance() {
    const period = document.getElementById('fin-period')?.value || 'total';
    let urlParams = `period=${period}`;

    if (period === 'custom' && datePickerInstance) {
        const dates = datePickerInstance.selectedDates;
        if (dates.length === 2) {
            const start = flatpickr.formatDate(dates[0], "Y-m-d");
            const end = flatpickr.formatDate(dates[1], "Y-m-d");
            urlParams = `start=${start}T00:00:00&end=${end}T23:59:59`;
        } else {
            return;
        }
    }

    try {
        const resSum = await fetch(`${API_BASE}/reports/financial-summary?${urlParams}`, { headers: {'Authorization': `Bearer ${token}`} });
        const data = await resSum.json();
        if (document.getElementById('fin-total')) document.getElementById('fin-total').innerText = `$${(data.total_recaudado || 0).toFixed(2)}`;
        if (document.getElementById('fin-count')) document.getElementById('fin-count').innerText = data.cantidad_pagos || 0;
        if (document.getElementById('fin-avg')) document.getElementById('fin-avg').innerText = `$${(data.ticket_promedio || 0).toFixed(2)}`;
        if (document.getElementById('stat-money')) document.getElementById('stat-money').innerText = `$${(data.total_recaudado || 0).toFixed(0)}`;

        const resHistory = await fetch(`${API_BASE}/reports/payment-history?${urlParams}`, { headers: {'Authorization': `Bearer ${token}`} });
        const history = await resHistory.json();
        const body = document.getElementById('payment-list');
        if (!body || !Array.isArray(history)) return;
        body.innerHTML = '';
        
        const chartData = {};
        history.forEach(p => {
            const dateKey = p.fecha_hora.split('T')[0];
            chartData[dateKey] = (chartData[dateKey] || 0) + p.costo_estadia;

            const time = p.fecha_hora.replace('T', ' ').substring(0, 19);
            body.innerHTML += `
                <tr>
                    <td>${time}</td>
                    <td><span class="plate-tag gold">${p.patente_detectada}</span></td>
                    <td style="font-weight: 800; color: var(--secondary)">$${p.costo_estadia.toFixed(2)}</td>
                    <td><span class="status-pill" style="background: rgba(16, 185, 129, 0.1); color: var(--secondary)">PAGADO</span></td>
                </tr>`;
        });

        if (document.getElementById('tab-finance').classList.contains('active')) {
            updateRevenueChart(chartData);
        }
    } catch (e) { console.error("Finance error:", e); }
}

function updateRevenueChart(chartData) {
    const canvas = document.getElementById('revenueChart');
    if (!canvas) return;

    const sortedDates = Object.keys(chartData).sort();
    const values = sortedDates.map(d => chartData[d]);

    if (revenueChartInstance) {
        revenueChartInstance.destroy();
    }

    if (sortedDates.length === 0) return;

    revenueChartInstance = new Chart(canvas.getContext('2d'), {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Ingresos ($)',
                data: values,
                borderColor: '#C5A059',
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#C5A059',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.05)' },
                    ticks: { color: '#888', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#888', font: { size: 10 } }
                }
            }
        }
    });
}

function toggleCustomFilters() {
    const period = document.getElementById('fin-period').value;
    const container = document.getElementById('custom-date-container');
    
    if (period === 'custom') {
        container.style.display = 'flex';
        if (!datePickerInstance) {
            datePickerInstance = flatpickr("#fin-date-range", {
                mode: "range",
                dateFormat: "Y-m-d",
                theme: "dark",
                locale: {
                    rangeSeparator: " hasta "
                },
                onClose: function(selectedDates) {
                    if (selectedDates.length === 2) loadFinance();
                }
            });
        }
    } else {
        container.style.display = 'none';
        loadFinance();
    }
}

async function pay(plate) {
    if (!confirm(`Confirmar cobro manual para ${plate}?`)) return;
    await fetch(`${API_BASE}/access/pay-stay?plate=${plate}`, { method: 'POST', headers: {'Authorization': `Bearer ${token}`} });
    showToast('Pago registrado con éxito');
    updateDashboard();
}

async function manualEntry() {
    const plate = document.getElementById('manual-plate').value;
    if (!plate) return alert('Ingrese una patente');
    const res = await fetch(`${API_BASE}/admin/manual-entry?plate=${plate}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
        showToast(data.message);
        document.getElementById('manual-plate').value = '';
        updateDashboard();
    } else {
        alert(data.detail || 'Error en registro manual');
    }
}

async function manualExit() {
    const plate = document.getElementById('manual-plate').value;
    if (!plate) return alert('Ingrese una patente');
    const res = await fetch(`${API_BASE}/admin/manual-exit?plate=${plate}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
        showToast(data.message);
        document.getElementById('manual-plate').value = '';
        updateDashboard();
    } else {
        alert(data.detail || 'Error en registro manual');
    }
}

async function loadSettings() {
    try {
        const res = await fetch(`${API_BASE}/settings/prices`, { headers: {'Authorization': `Bearer ${token}`} });
        const d = await res.json();
        if (d.precio_hora && document.getElementById('cfg-price')) {
            document.getElementById('cfg-price').value = d.precio_hora;
        }
    } catch (e) { console.error("Error loading settings:", e); }
}

async function savePrice() {
    const val = document.getElementById('cfg-price').value;
    await fetch(`${API_BASE}/settings/prices?clave=precio_hora&valor=${val}`, { 
        method: 'POST',
        headers: {'Authorization': `Bearer ${token}`}
    });
    showToast('Tarifa actualizada correctamente');
}

async function resetSys() {
    if (!confirm('ESTÁS SEGURO? Se borrará TODO.')) return;
    await fetch(`${API_BASE}/system/reset`, { 
        method: 'POST',
        headers: {'Authorization': `Bearer ${token}`}
    });
    location.reload();
}

// --- LÓGICA DEL PERFIL DE USUARIO ---
function showSection(sectionId, el) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.profile-section').forEach(s => s.classList.remove('active'));
    const sectionEl = document.getElementById(`section-${sectionId}`);
    if (sectionEl) sectionEl.classList.add('active');
    
    if (sectionId === 'reservas') loadReservations();
    if (sectionId === 'pagos') loadPaymentHistory();
}

async function loadProfile() {
    const res = await fetch(`${API_BASE}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return logout();
    const user = await res.json();
    document.getElementById('user-name').innerText = `Hola, ${user.nombre.toUpperCase()}`;
    const dni = document.getElementById('val-dni'); if (dni) dni.innerText = user.dni;
    const email = document.getElementById('val-email'); if (email) email.innerText = user.email;
    const tel = document.getElementById('val-tel'); if (tel) tel.innerText = user.telefono || 'No registrado';
    const pts = document.getElementById('points-val'); if (pts) pts.innerText = user.puntos_acumulados || 0;
    const statPts = document.getElementById('stat-points'); if (statPts) statPts.innerText = user.puntos_acumulados || 0;
}

async function loadVehicles() {
    const res = await fetch(`${API_BASE}/user/vehicles`, { headers: { 'Authorization': `Bearer ${token}` } });
    const vehicles = await res.json();
    const list = document.getElementById('vehicle-list');
    const statVehicles = document.getElementById('stat-vehicles');
    if (statVehicles) statVehicles.innerText = vehicles.length;
    if (!list) return;
    list.innerHTML = vehicles.length ? '' : '<p style="color: #444; font-weight: 600;">No tienes vehículos registrados.</p>';
    vehicles.forEach(v => {
        list.innerHTML += `<div class="vehicle-item" style="display: flex; justify-content: space-between; align-items: center; padding: 18px; background: #000; border-radius: 10px; margin-bottom: 12px; border: 1px solid #222;">
            <div><span class="plate-badge">${v.patente}</span> <b style="margin-left:15px">${v.marca_modelo}</b></div>
        </div>`;
    });
}

async function loadActiveStays() {
    const res = await fetch(`${API_BASE}/user/active-stays`, { headers: { 'Authorization': `Bearer ${token}` } });
    const stays = await res.json();
    const list = document.getElementById('active-stays-list');
    if (!list) return;
    if (stays.length) {
        list.innerHTML = '';
        stays.forEach(s => {
            list.innerHTML += `
                <div class="card" style="border-left: 4px solid var(--dorado);">
                    <div style="font-weight: 800; font-size: 1.2rem; color: var(--dorado); letter-spacing: 1px"><i class="fas fa-location-dot"></i> ${s.patente}</div>
                    <div style="font-size: 0.85rem; color: #555; margin-top: 5px; font-weight: 600"><i class="fas fa-calendar-day"></i> INGRESÓ: ${s.ingreso.replace('T', ' ').substring(0, 16)}</div>
                    <div style="font-family: 'Montserrat'; font-size: 2.2rem; font-weight: 800; color: var(--danger); margin: 15px 0;">$${s.deuda}</div>
                    <button class="btn btn-primary" style="padding: 10px 20px; font-size: 0.75rem"><i class="fab fa-cc-mastercard"></i> Pagar con Mercado Pago</button>
                </div>`;
        });
    } else {
        list.innerHTML = '<p style="color: #444; font-weight: 600;">No se registran vehículos en el predio actualmente.</p>';
    }
}

// --- ACTUALIZAR CARGA DE VEHÍCULOS EN SELECTS ---
async function loadReservations() {
    const resV = await fetch(`${API_BASE}/user/vehicles`, { headers: { 'Authorization': `Bearer ${token}` } });
    const vehicles = await resV.json();
    const selects = document.querySelectorAll('.res-vehicle');
    
    selects.forEach(select => {
        select.innerHTML = vehicles.length ? '<option value="">Seleccioná tu vehículo...</option>' : '<option value="">No tenés vehículos</option>';
        vehicles.forEach(v => {
            select.innerHTML += `<option value="${v.patente}">${v.patente} - ${v.marca_modelo}</option>`;
        });
    });

    const resR = await fetch(`${API_BASE}/user/reservations`, { headers: { 'Authorization': `Bearer ${token}` } });
    const reservations = await resR.json();
    const list = document.getElementById('reservation-list');
    const statReservations = document.getElementById('stat-reservations');
    if (statReservations) statReservations.innerText = reservations.length;
    if (list) {
        list.innerHTML = reservations.length ? '' : '<p style="color: #444; font-weight: 600;">No tienes reservas activas.</p>';
        reservations.forEach(r => {
            list.innerHTML += `
                <div class="card" style="border-left: 4px solid ${r.estado_pago === 'Pagado' ? 'var(--secondary)' : '#f59e0b'}">
                    <div style="font-weight: 800; font-size: 1.1rem; color: var(--dorado); letter-spacing: 1px">${r.patente}</div>
                    <div style="font-size: 0.85rem; color: #555; margin-top: 8px; font-weight: 600">DESDE: ${r.fecha_inicio.replace('T', ' ').substring(0, 16)}</div>
                    <div style="font-size: 0.85rem; color: #555; font-weight: 600">HASTA: ${r.fecha_fin.replace('T', ' ').substring(0, 16)}</div>
                    <div style="font-family: 'Montserrat'; font-weight: 800; margin-top: 15px; font-size: 1.2rem; color: ${r.estado_pago === 'Pagado' ? 'var(--secondary)' : '#f59e0b'}">$${r.monto_total} - ${r.estado_pago.toUpperCase()}</div>
                </div>`;
        });
    }
}

async function loadPaymentHistory() {
    const res = await fetch(`${API_BASE}/user/payment-history`, { headers: { 'Authorization': `Bearer ${token}` } });
    const payments = await res.json();
    const list = document.getElementById('payment-list');
    if (!list) return;
    if (payments.length) {
        list.innerHTML = '';
        payments.forEach(p => {
            const fecha = p.fecha_hora.replace('T', ' ').substring(0, 19);
            list.innerHTML += `
                <div class="vehicle-item" style="border-left: 4px solid var(--secondary); display: flex; justify-content: space-between; align-items: center; padding: 18px; background: #000; border-radius: 10px; margin-bottom: 12px; border: 1px solid #222;">
                    <div style="flex: 1">
                        <span class="plate-badge">${p.patente_detectada}</span>
                        <span style="margin-left: 15px; font-size: 0.9rem; color: #888"><i class="fas fa-clock" style="font-size: 0.8rem;"></i> ${fecha}</span>
                    </div>
                    <div style="font-family: 'Montserrat'; font-weight: 800; font-size: 1.2rem; color: var(--secondary)">$${p.costo_estadia.toFixed(2)}</div>
                </div>`;
        });
    } else {
        list.innerHTML = '<p style="color: #444; font-weight: 600;">Aún no registra transacciones pagadas.</p>';
    }
}

// --- LÓGICA DE FORMULARIO DE CONTACTO ---
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.onsubmit = (e) => {
        e.preventDefault();
        alert('Gracias por comunicarse con AUTOPASS. Su mensaje ha sido enviado con éxito.');
        e.target.reset();
    };
}

// --- NOTIFICACIONES TOAST ---
function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}
