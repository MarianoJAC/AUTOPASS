const API_BASE = '/v1';
const token = localStorage.getItem('token');

function formatDate(isoStr) {
    if (!isoStr) return '---';
    const d = new Date(isoStr);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${mins}`;
}

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
                localStorage.setItem('nombre', data.nombre.toUpperCase());
                localStorage.setItem('apellido', data.apellido.toUpperCase());
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
    initPasswordValidation('reg-password', 'reg-password-confirm', 'reg-password-strength', 'reg-req-len', 'reg-req-up', 'reg-req-spec', 'reg-req-match');

    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const errorMsg = document.getElementById('register-error');
        errorMsg.style.display = 'none';

        const dni = document.getElementById('reg-dni').value.replace(/\D/g, '');
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;
        const email = document.getElementById('reg-email').value;
        const telefono = document.getElementById('reg-tel').value.replace(/\D/g, '');

        if (password !== passwordConfirm) {
            errorMsg.innerText = 'Las contraseñas no coinciden';
            errorMsg.style.display = 'block';
            return;
        }

        if (dni.length < 7 || dni.length > 8) {
            errorMsg.innerText = 'El DNI debe tener 7 u 8 números';
            errorMsg.style.display = 'block';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMsg.innerText = 'Ingresá un correo electrónico válido';
            errorMsg.style.display = 'block';
            return;
        }

        if (telefono.length < 10) {
            errorMsg.innerText = 'El teléfono debe tener al menos 10 dígitos (característica + número)';
            errorMsg.style.display = 'block';
            return;
        }
        
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
            errorMsg.innerText = 'La contraseña no cumple con los requisitos de seguridad';
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
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = 'Procesando...';
            btn.disabled = true;

            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('¡Registro exitoso! Bienvenido a AUTOPASS');
                setTimeout(() => switchModal('registerModal', 'loginModal'), 1500);
            } else {
                const data = await res.json();
                errorMsg.innerText = data.detail || 'Error en el registro';
                errorMsg.style.display = 'block';
                btn.innerText = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            errorMsg.innerText = 'Error de conexión con el servidor';
            errorMsg.style.display = 'block';
            const btn = e.target.querySelector('button[type="submit"]');
            btn.innerText = 'Finalizar Registro';
            btn.disabled = false;
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

        const resOcc = await fetch(`${API_BASE}/parking/current-occupancy`);
        const occ = await resOcc.json();
        const occBody = document.getElementById('occ-list');
        if (occBody && Array.isArray(occ)) {
            occBody.innerHTML = '';
            occ.forEach(o => {
                const entrada = new Date(o.ingreso);
                const ahora = new Date();
                const diffMs = ahora - entrada;
                const diffHrs = Math.floor(diffMs / 3600000);
                const diffMins = Math.floor((diffMs % 3600000) / 60000);
                const diffSecs = Math.floor((diffMs % 60000) / 1000);
                const permanencia = `${diffHrs}h ${diffMins}m ${diffSecs}s`;

                occBody.innerHTML += `
                    <tr>
                        <td><span class="plate-tag gold">${o.patente}</span></td>
                        <td>${o.ingreso.split('T')[1].substring(0, 5)}</td>
                        <td style="color: #888; font-size: 0.8rem; font-weight: 600">${permanencia}</td>
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
                <td>${u.nombre.toUpperCase()} ${u.apellido.toUpperCase()}</td>
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
    if (sectionId === 'inicio') loadProfile();
}

async function loadProfile() {
    const res = await fetch(`${API_BASE}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) {
        if (res.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('rol');
            localStorage.removeItem('nombre');
            localStorage.removeItem('apellido');
            window.location.href = '/';
        }
        return;
    }
    const user = await res.json();
    
    // Actualizar localStorage con datos frescos
    localStorage.setItem('nombre', user.nombre.toUpperCase());
    localStorage.setItem('apellido', user.apellido.toUpperCase());
    
    document.getElementById('user-name').innerText = `Hola, ${user.nombre.toUpperCase()}`;
    const pts = document.getElementById('points-val'); if (pts) pts.innerText = user.puntos_acumulados || 0;
    
    const balance = document.getElementById('balance-val'); if (balance) balance.innerText = `$${(user.saldo || 0).toFixed(2)}`;

    // Poblar visualización de datos en sección Mi Cuenta
    const dispNombre = document.getElementById('display-nombre'); if (dispNombre) dispNombre.innerText = user.nombre.toUpperCase();
    const dispApellido = document.getElementById('display-apellido'); if (dispApellido) dispApellido.innerText = user.apellido.toUpperCase();
    const dispEmail = document.getElementById('display-email'); if (dispEmail) dispEmail.innerText = user.email;
    
    // Normalizar Teléfono (XX XXXX XXXX)
    const dispTel = document.getElementById('display-telefono'); 
    if (dispTel) {
        let tel = user.telefono || '';
        if (tel.length >= 10) {
            dispTel.innerText = tel.replace(/(\d{2})(\d{4})(\d+)/, "$1 $2 $3");
        } else {
            dispTel.innerText = tel || 'No registrado';
        }
    }
    
    // Normalizar DNI con puntos para visualización
    const dispDni = document.getElementById('display-dni');
    if (dispDni && user.dni) {
        let dniStr = user.dni.toString();
        if (dniStr.length === 8) {
            dispDni.innerText = dniStr.replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
        } else if (dniStr.length === 7) {
            dispDni.innerText = dniStr.replace(/(\d{1})(\d{3})(\d{3})/, "$1.$2.$3");
        } else {
            dispDni.innerText = dniStr;
        }
    }

    // Inicializar validación de cambio de contraseña si estamos en la sección de perfil
    initPasswordValidation('new-password', 'confirm-new-password');
}

function initPasswordValidation(passId, confirmId, strengthId = 'password-strength', reqLenId = 'req-len', reqUpId = 'req-up', reqSpecId = 'req-spec', reqMatchId = 'req-match') {
    const regPass = document.getElementById(passId);
    const regPassConfirm = document.getElementById(confirmId);
    const strengthMeter = document.getElementById(strengthId);
    
    const reqLen = document.getElementById(reqLenId);
    const reqUp = document.getElementById(reqUpId);
    const reqSpec = document.getElementById(reqSpecId);
    const reqMatch = document.getElementById(reqMatchId);

    if (regPass && strengthMeter) {
        const validatePass = () => {
            const val = regPass.value;
            const confirmVal = regPassConfirm ? regPassConfirm.value : "";
            
            strengthMeter.className = 'strength-meter';
            
            const isLen = val.length >= 8;
            const isUp = /[A-Z]/.test(val);
            const isSpec = /[!@#$%^&*(),.?":{}|<>]/.test(val);
            const isMatch = val.length > 0 && val === confirmVal;

            const updateReq = (el, condition) => {
                if (!el) return;
                if (condition) {
                    el.classList.add('satisfied');
                    el.querySelector('i').className = 'fas fa-check-circle';
                } else {
                    el.classList.remove('satisfied');
                    el.querySelector('i').className = 'far fa-circle';
                }
            };

            updateReq(reqLen, isLen);
            updateReq(reqUp, isUp);
            updateReq(reqSpec, isSpec);
            updateReq(reqMatch, isMatch);

            if (val.length === 0) return;
            let strength = 0;
            if (isLen) strength++;
            if (isUp) strength++;
            if (isSpec) strength++;
            
            if (strength === 1) strengthMeter.classList.add('strength-weak');
            if (strength === 2) strengthMeter.classList.add('strength-medium');
            if (strength === 3) strengthMeter.classList.add('strength-strong');
        };

        regPass.addEventListener('input', validatePass);
        if (regPassConfirm) regPassConfirm.addEventListener('input', validatePass);
    }
}

function enterEditMode(field) {
    const item = document.getElementById(`item-${field}`);
    const display = item.querySelector('.display-mode');
    const edit = item.querySelector('.edit-mode');
    const input = document.getElementById(`input-${field}`);
    const displaySpan = document.getElementById(`display-${field}`);

    // Poblar input con el valor actual (limpio)
    input.value = displaySpan.innerText.replace(/\./g, '').replace(/\s/g, '');
    
    display.style.display = 'none';
    edit.style.display = 'flex';
    input.focus();
}

function exitEditMode(field) {
    const item = document.getElementById(`item-${field}`);
    const display = item.querySelector('.display-mode');
    const edit = item.querySelector('.edit-mode');
    
    display.style.display = 'flex';
    edit.style.display = 'none';
}

async function saveField(field) {
    const labels = { 'nombre': 'Nombre/s', 'apellido': 'Apellido', 'email': 'Correo Electrónico', 'telefono': 'Teléfono', 'dni': 'DNI' };
    const newValue = document.getElementById(`input-${field}`).value;

    const payload = {};
    payload[field] = newValue;

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            showToast(`${labels[field]} actualizado`);
            exitEditMode(field);
            loadProfile();
        } else {
            const d = await res.json();
            alert(d.detail || 'Error al actualizar');
        }
    } catch (err) {
        alert('Error de conexión al guardar');
    }
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
        list.innerHTML += `
            <div class="vehicle-card">
                <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2;">
                    <span class="plate-badge" style="letter-spacing: 2px;">${v.patente}</span>
                    <button class="btn btn-outline delete-vehicle-btn" style="padding: 5px 10px; font-size: 0.7rem; color: var(--danger); border-color: var(--danger); background: rgba(239, 68, 68, 0.05);" onclick="deleteVehicle('${v.patente}')"><i class="fas fa-xmark"></i></button>
                </div>
                
                <div class="vehicle-card-divider"></div>

                <div style="font-weight: 700; color: #fff; font-size: 1rem; display: flex; align-items: center; gap: 12px; position: relative; z-index: 2;">
                    <div style="background: rgba(197, 160, 89, 0.1); width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                        <i class="fas fa-car" style="color: var(--dorado); font-size: 0.9rem;"></i>
                    </div>
                    <span>${v.marca_modelo}</span>
                </div>
            </div>`;
    });
}

async function deleteVehicle(plate) {
    if (!confirm(`¿Está seguro de que desea eliminar el vehículo con patente ${plate}?`)) return;
    const res = await fetch(`${API_BASE}/user/vehicles/${plate}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
        showToast('Vehículo eliminado con éxito');
        loadVehicles();
    } else {
        const d = await res.json();
        alert(d.detail || 'Error al eliminar vehículo');
    }
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
                    <button class="btn btn-primary" style="padding: 10px 20px; font-size: 0.75rem" onclick="payWithMP('${s.patente}')"><i class="fab fa-cc-mastercard"></i> Pagar con Mercado Pago</button>
                </div>`;
        });
    } else {
        list.innerHTML = '<div style="text-align: center; padding: 20px; color: #555;"><i class="fas fa-parking" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i><p style="font-weight: 600; font-size: 0.85rem;">No se registran vehículos en el predio actualmente.</p></div>';
    }
}

async function payWithMP(plate) {
    alert(`Simulando integración con Mercado Pago para ${plate}. El sistema procesará el pago automáticamente.`);
    await fetch(`${API_BASE}/access/pay-stay?plate=${plate}`, { method: 'POST', headers: {'Authorization': `Bearer ${token}`} });
    showToast('Pago exitoso');
    loadActiveStays();
    loadProfile();
}

function showReservationInfo(nombre, info) {
    document.getElementById('info-parking-name').innerText = nombre || 'Sede AUTOPASS';
    document.getElementById('info-parking-desc').innerText = info || 'No hay información adicional disponible para esta sede.';
    openModal('infoModal');
}

async function payReservation(resId, plate) {
    alert(`Simulando integración con Mercado Pago para la reserva ${resId} de la patente ${plate}. El sistema procesará el pago automáticamente.`);
    const res = await fetch(`${API_BASE}/user/pay-reservation?res_id=${resId}`, { 
        method: 'POST', 
        headers: {'Authorization': `Bearer ${token}`} 
    });
    
    if (res.ok) {
        showToast('Pago de reserva exitoso');
        loadReservations();
        loadProfile();
    } else {
        const d = await res.json();
        alert(d.detail || 'Error al procesar el pago');
    }
}

// --- LÓGICA DE CALCULADORA DE COSTO RESERVAS ---
let preciosGlobales = { precio_hora: 1500, precio_dia: 12000, precio_semana: 60000, precio_quincena: 100000, precio_mes: 180000 };

async function actualizarPreciosGlobales() {
    try {
        const res = await fetch(`${API_BASE}/settings/prices`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            preciosGlobales = await res.json();
        }
    } catch (e) { console.error("Error al cargar tarifas:", e); }
}


function updateReservationCost(form) {
    if (!form) form = document.querySelector('.reservation-form');
    
    const startInput = form.querySelector('.res-start');
    const endInput = form.querySelector('.res-end');
    const typeSelect = form.querySelector('#res-type') || form.querySelector('.res-type');
    const summary = form.querySelector('#res-summary') || form.querySelector('.res-summary');
    const durationEl = form.querySelector('#res-duration') || form.querySelector('.res-duration');
    const totalCostEl = form.querySelector('#res-total-cost') || form.querySelector('.res-total-cost');
    
    if (!startInput || !endInput) return;

    const type = typeSelect ? typeSelect.value : 'hora';
    let total = 0;
    let durationTxt = "";

    if (type === 'dia') {
        if (startInput.value) {
            total = preciosGlobales.precio_dia || 12000;
            durationTxt = "1 Día";
        }
        if (total === 0 && summary) { summary.style.display = 'none'; return; }
    } else if (startInput.value && endInput.value) {
        let start, end;
        if (type === 'hora') {
            const timeInput = form.querySelector('.res-time');
            const hoursInput = form.querySelector('.res-hours');
            const timeStr = timeInput ? timeInput.value : '08:00';
            start = new Date(startInput.value + 'T' + timeStr);
            const hours = parseInt(hoursInput ? hoursInput.value : 1) || 1;
            end = new Date(start.getTime() + hours * 3600000);
        } else {
            start = new Date(startInput.value + 'T00:00:00');
            end = new Date(endInput.value + 'T00:00:00');
        }
        const diffMs = end - start;
        
        if (diffMs > 0) {
            const diffHrs = diffMs / 3600000;

            if (type === 'hora') {
                const units = Math.ceil(diffHrs);
                total = units * (preciosGlobales.precio_hora || 1500);
                durationTxt = `${Math.floor(diffHrs)}h ${Math.round((diffHrs % 1) * 60)}m`;
            } else if (type === 'semana') {
                const units = Math.ceil(diffHrs / (24 * 7));
                total = units * (preciosGlobales.precio_semana || 60000);
                durationTxt = `${units} ${units === 1 ? 'Semana' : 'Semanas'}`;
            } else if (type === 'quincena') {
                const units = Math.ceil(diffHrs / (24 * 15));
                total = units * (preciosGlobales.precio_quincena || 100000);
                durationTxt = `${units} ${units === 1 ? 'Quincena' : 'Quincenas'}`;
            } else if (type === 'mes') {
                const units = Math.ceil(diffHrs / (24 * 30));
                total = units * (preciosGlobales.precio_mes || 180000);
                durationTxt = `${units} ${units === 1 ? 'Mes' : 'Meses'}`;
            }
        }
        if (total === 0 && summary) { summary.style.display = 'none'; return; }
    } else {
        if (summary) summary.style.display = 'none';
        return;
    }
    
    if (durationEl) durationEl.innerText = durationTxt;
    if (totalCostEl) totalCostEl.innerText = `$${total.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
    if (summary) summary.style.display = 'flex';
}

// --- LÓGICA DE SELECTORES DE RESERVA DINÁMICOS ---
function toggleReservationMode(form) {
    const typeSelect = form.querySelector('#res-type') || form.querySelector('.res-type');
    const type = typeSelect ? typeSelect.value : 'hora';
    const hoursGroup = document.getElementById('hours-group');
    const diasGroup = document.getElementById('dias-group');
    const timeGroup = document.getElementById('time-group');
    const endGroup = document.querySelector('.right-cell > .form-group:last-child');

    hoursGroup.style.display = type === 'hora' ? 'block' : 'none';
    timeGroup.style.display = type === 'hora' ? 'block' : 'none';
    diasGroup.style.display = 'none';
    if (endGroup) endGroup.style.display = (type === 'hora' || type === 'dia') ? 'none' : 'block';
}

function initReservationPickers() {
    document.querySelectorAll('.reservation-form').forEach(form => {
        const startInput = form.querySelector('.res-start');
        const endInput = form.querySelector('.res-end');
        const hoursInput = form.querySelector('.res-hours');
        const typeSelect = form.querySelector('#res-type') || form.querySelector('.res-type');
        
        if (!startInput || !endInput) return;

        function getConfigBase() {
            return {
                enableTime: false,
                altInput: true,
                altInputClass: "form-control",
                altFormat: "d/m/Y",
                dateFormat: "Y-m-d",
                minDate: "today",
                theme: "dark",
                locale: { firstDayOfWeek: 1 }
            };
        }

        function rebuildPickers() {
            const startVal = startInput.value;
            const endVal = endInput.value;
            form.startPicker?.destroy();
            form.endPicker?.destroy();

            const cfg = getConfigBase();
            form.startPicker = flatpickr(startInput, {
                ...cfg,
                onChange: function(selectedDates) {
                    if (selectedDates.length > 0) {
                        reconfigureEndPicker(selectedDates[0], form);
                    }
                    updateReservationCost(form);
                }
            });
            if (startVal) form.startPicker.setDate(startVal);

            const endCfg = getConfigBase();
            if (typeSelect && typeSelect.value !== 'hora') {
                endCfg.minDate = startInput.value || "today";
            }
            form.endPicker = flatpickr(endInput, {
                ...endCfg,
                onChange: function() {
                    updateReservationCost(form);
                }
            });
            if (endVal) form.endPicker.setDate(endVal);
        }

        if (hoursInput) {
            hoursInput.addEventListener('input', () => {
                if (form.startPicker && form.startPicker.selectedDates.length > 0) {
                    reconfigureEndPicker(form.startPicker.selectedDates[0], form);
                }
                updateReservationCost(form);
            });
        }

        const timeInput = form.querySelector('.res-time');
        if (timeInput) {
            timeInput.addEventListener('change', () => {
                if (form.startPicker && form.startPicker.selectedDates.length > 0) {
                    reconfigureEndPicker(form.startPicker.selectedDates[0], form);
                }
                updateReservationCost(form);
            });
        }

        form.querySelectorAll('.res-dia').forEach(cb => {
            cb.addEventListener('change', () => updateReservationCost(form));
        });

        rebuildPickers();
        toggleReservationMode(form);

        if (typeSelect) {
            typeSelect.addEventListener('change', () => {
                toggleReservationMode(form);
                rebuildPickers();
                if (form.startPicker && form.startPicker.selectedDates.length > 0) {
                    reconfigureEndPicker(form.startPicker.selectedDates[0], form);
                }
                updateReservationCost(form);
            });
        }

        if (startInput.value) {
            const d = new Date(startInput.value.replace(' ', 'T'));
            if (!isNaN(d)) reconfigureEndPicker(d, form);
        }
    });
}

function reconfigureEndPicker(startDate, form) {
    const typeSelect = form.querySelector('#res-type') || form.querySelector('.res-type');
    const endInput = form.querySelector('.res-end');
    const endPicker = form.endPicker;
    const hoursInput = form.querySelector('.res-hours');
    const timeInput = form.querySelector('.res-time');
    
    if (!endPicker || !typeSelect) return;

    const type = typeSelect.value;

    if (type === 'hora') {
        let hours = 1;
        if (hoursInput) {
            hours = parseInt(hoursInput.value) || 1;
            if (hours < 1) hours = 1;
            if (hours > 24) hours = 24;
        }
        let baseDate = new Date(startDate);
        if (timeInput && timeInput.value) {
            const [h, m] = timeInput.value.split(':');
            baseDate.setHours(parseInt(h), parseInt(m), 0, 0);
        }
        let endDate = new Date(baseDate);
        endDate.setHours(endDate.getHours() + hours);
        endPicker.setDate(endDate);
        endInput.readOnly = true;
        const alt = endInput.nextElementSibling;
        if (alt && alt.tagName === 'INPUT') {
            alt.readOnly = true;
            alt.style.opacity = "0.7";
            alt.style.cursor = "not-allowed";
        }
        updateReservationCost(form);
    } else if (type === 'dia') {
        endPicker.setDate(startDate);
        endPicker.set("minDate", startDate);
        endPicker.set("maxDate", startDate);
        endInput.readOnly = true;
        const alt = endInput.nextElementSibling;
        if (alt && alt.tagName === 'INPUT') {
            alt.readOnly = true;
            alt.style.opacity = "0.7";
            alt.style.cursor = "not-allowed";
        }
        updateReservationCost(form);
    } else {
        let endDate = new Date(startDate);
        if (type === 'semana') endDate.setDate(startDate.getDate() + 7);
        else if (type === 'quincena') endDate.setDate(startDate.getDate() + 15);
        else if (type === 'mes') endDate.setMonth(startDate.getMonth() + 1);

        endPicker.setDate(endDate);
        endPicker.set("minDate", endDate);
        endPicker.set("maxDate", endDate);
        endInput.readOnly = true;
        const alt = endInput.nextElementSibling;
        if (alt && alt.tagName === 'INPUT') {
            alt.readOnly = true;
            alt.style.opacity = "0.7";
            alt.style.cursor = "not-allowed";
        }
        updateReservationCost(form);
    }
}
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

    // --- LÓGICA DE CALCULADORA DE COSTO ---
    let hourlyRate = 1500; // Valor por defecto actualizado a 1500
    try {
        const resSettings = await fetch(`${API_BASE}/settings/prices`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (resSettings.ok) {
            const settings = await resSettings.json();
            hourlyRate = parseFloat(settings.precio_hora) || 1500;
            console.log("Tarifa actualizada desde DB:", hourlyRate);
        }
    } catch (e) { console.error("Error fetching rate", e); }

    const updateCost = () => {
        // Obtenemos los valores de los inputs originales de flatpickr
        const startVal = document.getElementById('res-start').value;
        const endVal = document.getElementById('res-end').value;
        const summary = document.getElementById('res-summary');
        
        if (startVal && endVal) {
            const start = new Date(startVal.replace(' ', 'T'));
            const end = new Date(endVal.replace(' ', 'T'));
            const diffMs = end - start;
            
            if (diffMs > 0) {
                const diffHrs = diffMs / 3600000;
                // Cálculo: Bloques de hora (redondeo hacia arriba)
                const hoursToCharge = Math.ceil(diffHrs);
                const total = hoursToCharge * hourlyRate;
                
                const h = Math.floor(diffHrs);
                const m = Math.round((diffHrs % 1) * 60);
                
                document.getElementById('res-duration').innerText = `${h}h ${m}m`;
                document.getElementById('res-total-cost').innerText = `$${total.toLocaleString('es-AR', {minimumFractionDigits: 0, maximumFractionDigits: 0})}`;
                summary.style.display = 'flex';
            } else {
                summary.style.display = 'none';
            }
        } else {
            summary.style.display = 'none';
        }
    };

    const resStart = document.getElementById('res-start');
    const resEnd = document.getElementById('res-end');
    if (resStart && resEnd) {
        resStart.addEventListener('change', updateCost);
        resEnd.addEventListener('change', updateCost);
    }

    const resR = await fetch(`${API_BASE}/user/reservations`, { headers: { 'Authorization': `Bearer ${token}` } });
    const reservations = await resR.json();
    const activeList = document.getElementById('reservation-list-active');
    const historyList = document.getElementById('reservation-list-history');
    const statReservations = document.getElementById('stat-reservations');
    
    if (statReservations) statReservations.innerText = reservations.filter(r => r.estado_reserva === 'Pendiente').length;
    
    if (activeList && historyList) {
        activeList.innerHTML = '';
        historyList.innerHTML = '';

        const activeItems = reservations.filter(r => r.estado_reserva === 'Pendiente');
        const historyItems = reservations.filter(r => r.estado_reserva !== 'Pendiente');

        if (activeItems.length === 0) activeList.innerHTML = '<p style="color: #444; font-weight: 600;">No tienes próximas reservas.</p>';
        
        window.renderHistory = (items) => {
            historyList.innerHTML = '';
            if (items.length === 0) {
                historyList.innerHTML = '<p style="color: #444; font-weight: 600;">No se encontraron registros para este periodo.</p>';
                return;
            }
            items.forEach(r => {
                const isCancelled = r.estado_reserva === 'Cancelada';
                const cardColor = isCancelled ? '#666' : (r.estado_pago === 'Pagado' ? 'var(--secondary)' : '#f59e0b');
                historyList.innerHTML += `
                    <div class="card" style="border-left: 4px solid ${cardColor}; opacity: ${isCancelled ? '0.6' : '1'}; margin-bottom: 0;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <div>
                                <div style="font-weight: 800; font-size: 1.1rem; color: var(--dorado); letter-spacing: 1px">${r.patente} ${isCancelled ? '[CANCELADA]' : ''}</div>
                                <div style="font-size: 0.85rem; color: #555; margin-top: 8px; font-weight: 600">DESDE: ${formatDate(r.fecha_inicio)}</div>
                                <div style="font-size: 0.85rem; color: #555; font-weight: 600">HASTA: ${formatDate(r.fecha_fin)}</div>
                                <div style="font-family: 'Montserrat'; font-weight: 800; margin-top: 10px; font-size: 1.1rem; color: ${cardColor}">$${r.monto_total} - ${r.estado_pago.toUpperCase()}</div>
                            </div>
                            <div style="display: flex; flex-direction: column; gap: 8px;">
                                <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.7rem;" onclick="showReservationInfo('${r.sucursal_nombre}', '${r.sucursal_info}')"><i class="fas fa-info-circle"></i> Info</button>
                            </div>
                        </div>
                        <div style="display: flex; gap: 10px; margin-top: 15px; border-top: 1px solid #222; padding-top: 15px;">
                            <button class="btn btn-outline" style="flex: 1; font-size: 0.75rem;" onclick="repeatReservation(${r.id})"><i class="fas fa-rotate"></i> Volver a reservar</button>
                            <button class="btn btn-outline" style="flex: 1; font-size: 0.7rem; color: var(--danger); border-color: var(--danger);" onclick="complainReservation(${r.id})"><i class="fas fa-circle-exclamation"></i> Reclamo</button>
                        </div>
                    </div>`;
            });
        };

        activeItems.forEach(r => {
            const cardColor = (r.estado_pago === 'Pagado' ? 'var(--secondary)' : '#f59e0b');
            activeList.innerHTML += `
                <div class="card" style="border-left: 4px solid ${cardColor}; margin-bottom: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <div style="font-weight: 800; font-size: 1.1rem; color: var(--dorado); letter-spacing: 1px">${r.patente}</div>
                            <div style="font-size: 0.85rem; color: #555; margin-top: 8px; font-weight: 600">DESDE: ${formatDate(r.fecha_inicio)}</div>
                            <div style="font-size: 0.85rem; color: #555; font-weight: 600">HASTA: ${formatDate(r.fecha_fin)}</div>
                            <div style="font-family: 'Montserrat'; font-weight: 800; margin-top: 10px; font-size: 1.1rem; color: ${cardColor}">$${r.monto_total} - ${r.estado_pago.toUpperCase()}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 8px;">
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.7rem;" onclick="showReservationInfo('${r.sucursal_nombre}', '${r.sucursal_info}')"><i class="fas fa-info-circle"></i> Info</button>
                            <button class="btn btn-outline" style="padding: 5px 10px; font-size: 0.7rem;" onclick="showDigitalPass(${r.id}, '${r.patente}', '${r.fecha_inicio}', '${r.fecha_fin}')"><i class="fas fa-share-nodes"></i> Pase</button>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; margin-top: 15px; border-top: 1px solid #222; padding-top: 15px;">
                        <button class="btn btn-primary" style="flex: 1; font-size: 0.75rem;" onclick="repeatReservation(${r.id})"><i class="fas fa-rotate"></i> Repetir</button>
                        <button class="btn btn-outline" style="flex: 1; font-size: 0.75rem;" onclick="modifyReservation(${r.id}, '${r.fecha_inicio}')"><i class="fas fa-pen-to-square"></i> Modificar</button>
                        <button class="btn btn-outline" style="flex: 1; font-size: 0.75rem; color: var(--danger); border-color: var(--danger);" onclick="cancelReservation(${r.id})"><i class="fas fa-xmark"></i> Cancelar</button>
                    </div>
                </div>`;
        });

        renderHistory(historyItems);

        window.historyItemsData = historyItems;
        flatpickr("#history-filter-date", {
            mode: "range",
            dateFormat: "Y-m-d",
            theme: "dark",
            onChange: function(selectedDates) {
                if (selectedDates.length === 2) {
                    const start = selectedDates[0];
                    const end = selectedDates[1];
                    end.setHours(23, 59, 59);
                    const filtered = window.historyItemsData.filter(r => {
                        const d = new Date(r.fecha_inicio);
                        return d >= start && d <= end;
                    });
                    renderHistory(filtered);
                }
            }
        });
    }
}

function clearHistoryFilter() {
    const input = document.getElementById('history-filter-date');
    if (input && input._flatpickr) input._flatpickr.clear();
    if (window.historyItemsData) renderHistory(window.historyItemsData);
}

function showDigitalPass(resId, plate, start, end) {
    const modal = document.getElementById('passModal');
    const qrContainer = document.getElementById('pass-qr');
    qrContainer.innerHTML = '';
    
    new QRCode(qrContainer, {
        text: `AUTOPASS-${resId}-${plate}`,
        width: 160,
        height: 160,
        colorDark : "#000000",
        colorLight : "#ffffff",
        correctLevel : QRCode.CorrectLevel.H
    });

    // Obtener nombre completo desde localStorage
    const nombre = localStorage.getItem('nombre') || 'Usuario';
    const apellido = localStorage.getItem('apellido') || '';
    
    document.getElementById('pass-plate').innerText = plate;
    document.getElementById('pass-owner').innerText = `${nombre} ${apellido}`.trim();
    document.getElementById('pass-start').innerText = formatDate(start);
    document.getElementById('pass-end').innerText = formatDate(end);
    document.getElementById('pass-id').innerText = `RES-${resId.toString().padStart(6, '0')}`;

    openModal('passModal');
}

async function sharePassContent() {
    const ticketEl = document.querySelector('.digital-pass');
    const btn = document.querySelector('.pass-footer button');
    const originalContent = btn.innerHTML;

    try {
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> GENERANDO IMAGEN...';
        btn.disabled = true;

        // Capturar el ticket como Canvas
        const canvas = await html2canvas(ticketEl, {
            scale: 2, // Mayor calidad
            backgroundColor: '#0a0a0a',
            logging: false,
            useCORS: true
        });

        // Convertir Canvas a Blob
        const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
        const file = new File([blob], 'ticket-autopass.png', { type: 'image/png' });

        // Intentar compartir el archivo
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
            await navigator.share({
                files: [file],
                title: 'Ticket AUTOPASS',
                text: 'Presenté este código al ingresar.'
            });
        } else {
            // Fallback: Descarga directa si no soporta compartir archivos
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'ticket-autopass.png';
            link.click();
            showToast('Imagen descargada (Compartir no soportado)');
        }
    } catch (err) {
        console.error('Error compartiendo ticket:', err);
        showToast('Error al generar la imagen');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

async function repeatReservation(id) {
    const res = await fetch(`${API_BASE}/user/reservations/${id}/repeat`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    const d = await res.json();
    if (res.ok) {
        const select = document.getElementById('res-vehicle');
        if (select) select.value = d.data.patente;
        showToast('Datos de vehículo cargados. Seleccione las nuevas fechas.');
        document.getElementById('res-start').scrollIntoView({ behavior: 'smooth' });
    }
}

async function cancelReservation(id) {
    if (!confirm('¿Desea cancelar esta reserva?')) return;
    const res = await fetch(`${API_BASE}/user/reservations/${id}/cancel`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
    if (res.ok) {
        showToast('Reserva cancelada');
        loadReservations();
        loadProfile();
    } else {
        const d = await res.json();
        alert(d.detail);
    }
}

async function modifyReservation(id, currentStart) {
    const startDt = new Date(currentStart);
    const now = new Date();
    if ((startDt - now) < 7200000) return alert('Solo con más de 2 horas de anticipación.');
    
    const newStart = prompt('Nueva fecha inicio (AAAA-MM-DD HH:MM):');
    if (!newStart) return;
    const newEnd = prompt('Nueva fecha fin (AAAA-MM-DD HH:MM):');
    if (!newEnd) return;

    const res = await fetch(`${API_BASE}/user/reservations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ fecha_inicio: newStart.replace(' ', 'T'), fecha_fin: newEnd.replace(' ', 'T') })
    });

    if (res.ok) {
        showToast('Reserva modificada');
        loadReservations();
    } else {
        const d = await res.json();
        alert(d.detail);
    }
}

async function complainReservation(id) {
    const msg = prompt('Motivo del reclamo:');
    if (!msg) return;
    const res = await fetch(`${API_BASE}/user/reservations/${id}/complain?message=${encodeURIComponent(msg)}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) showToast('Reclamo enviado');
}

const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.onsubmit = (e) => {
        e.preventDefault();
        alert('Gracias por comunicarse con AUTOPASS.');
        e.target.reset();
    };
}

function showToast(msg) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerText = msg;
    container.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

let currentSlideIndex = 0;
function showSlides() {
    const slides = document.querySelectorAll('.carousel-slide');
    const dots = document.querySelectorAll('.dot');
    if (slides.length === 0) return;
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    currentSlideIndex++;
    if (currentSlideIndex > slides.length) currentSlideIndex = 1;
    slides[currentSlideIndex-1].classList.add('active');
    dots[currentSlideIndex-1].classList.add('active');
    setTimeout(showSlides, 5000);
}

function toggleAddVehicleForm() {
    const formContainer = document.getElementById('add-vehicle-container');
    if (formContainer) formContainer.classList.toggle('active');
}

function togglePasswordForm() {
    const container = document.getElementById('password-form-container');
    if (!container) return;
    if (container.style.maxHeight === '0px' || container.style.maxHeight === '') {
        container.style.maxHeight = '1000px';
        container.style.opacity = '1';
        container.style.marginTop = '20px';
    } else {
        container.style.maxHeight = '0px';
        container.style.opacity = '0';
        container.style.marginTop = '0px';
    }
}

function toggleHistory() {
    const container = document.getElementById('history-container');
    const btn = document.getElementById('toggle-history-btn');
    if (!container || !btn) return;

    if (container.style.maxHeight === '0px' || container.style.maxHeight === '') {
        container.style.maxHeight = '2000px';
        container.style.opacity = '1';
        container.style.marginTop = '20px';
        btn.innerHTML = '<i class="fas fa-chevron-up"></i> Ocultar';
    } else {
        container.style.maxHeight = '0px';
        container.style.opacity = '0';
        container.style.marginTop = '0px';
        btn.innerHTML = '<i class="fas fa-chevron-down"></i> Ver';
    }
}

async function changePassword(e) {
    e.preventDefault();
    const current = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-new-password').value;
    if (newPass !== confirm) return alert('Las contraseñas no coinciden');

    const res = await fetch(`${API_BASE}/user/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ old_password: current, new_password: newPass })
    });

    if (res.ok) {
        showToast('Contraseña actualizada');
        togglePasswordForm();
        e.target.reset();
    } else {
        const d = await res.json();
        alert(d.detail || 'Error al cambiar contraseña');
    }
}
