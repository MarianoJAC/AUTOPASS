/**
 * AUTOPASS Professional Dashboard Logic
 * Handles tab switching, real-time updates, and administrative actions.
 */

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
    initClock();
    checkSystemHealth();
    
    // Check for saved tab or default to live
    const lastTab = localStorage.getItem('activeAdminTab') || 'live';
    const activeItem = document.querySelector(`.nav-item[onclick*="'${lastTab}'"]`);
    if (activeItem) {
        switchTab(lastTab, activeItem);
    }

    // Live Refresh every 10 seconds for stats
    setInterval(() => {
        const activeTab = localStorage.getItem('activeAdminTab');
        if (activeTab === 'live') loadLiveStats();
        if (activeTab === 'occupancy') loadOccupancy();
    }, 10000);
});

/**
 * Updates the dashboard clock every second.
 */
function initClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;
    
    const update = () => {
        const now = new Date();
        clockEl.innerText = now.toLocaleTimeString('es-AR', { hour12: false });
    };
    
    update();
    setInterval(update, 1000);
}

/**
 * Checks system status (DB, MQTT, API).
 */
async function checkSystemHealth() {
    const dot = document.getElementById('health-db');
    if (!dot) return;
    
    const res = await apiClient.get('/system/status');
    if (res.ok) {
        dot.style.background = res.data.status === 'ok' ? '#10b981' : '#ef4444';
        dot.title = res.data.status === 'ok' ? 'Sistema Operativo' : 'Error en el sistema';
    } else {
        dot.style.background = '#ef4444';
    }
}

// --- NAVIGATION ---

function switchTab(tabId, element) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    element.classList.add('active');
    
    document.querySelectorAll('.tab-view').forEach(view => view.classList.remove('active'));
    const activeTab = document.getElementById(`tab-${tabId}`);
    if (activeTab) activeTab.classList.add('active');
    
    const titleEl = document.getElementById('view-title');
    if (titleEl) {
        const titles = {
            'live': 'Monitoreo',
            'occupancy': 'Ocupación Actual',
            'admin-reservations': 'Reservas de Usuarios',
            'users': 'Gestión de Usuarios',
            'finance': 'Reporte Financiero',
            'settings': 'Configuración'
        };
        titleEl.innerText = titles[tabId] || 'Dashboard';
    }
    
    localStorage.setItem('activeAdminTab', tabId);
    loadTabData(tabId);
}

function loadTabData(tabId) {
    switch (tabId) {
        case 'live':
            loadLiveStats();
            loadRecentLogs();
            break;
        case 'occupancy':
            loadOccupancy();
            break;
        case 'admin-reservations':
            loadAdminReservations();
            break;
        case 'users':
            loadUsers();
            break;
        case 'finance':
            loadFinanceData();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// --- TAB DATA LOADING ---

async function loadLiveStats() {
    // 1. Ocupación
    const resStatus = await apiClient.get('/parking/status');
    if (resStatus.ok) {
        const free = resStatus.data.disponibilidad;
        const occupied = resStatus.data.ocupacion_actual;
        const total = resStatus.data.capacidad_total;

        document.getElementById('stat-free').innerText = free;
        document.getElementById('stat-occupied').innerText = occupied;

        // Actualizar barras de progreso
        const barFree = document.getElementById('bar-free');
        const barOccupied = document.getElementById('bar-occupied');
        if (barFree) barFree.style.width = `${(free / total) * 100}%`;
        if (barOccupied) barOccupied.style.width = `${(occupied / total) * 100}%`;
    }

    // 2. Ingresos hoy
    const resFinance = await apiClient.get('/reports/financial-summary?period=day');
    if (resFinance.ok) {
        document.getElementById('stat-entries').innerText = resFinance.data.cantidad_pagos;
        document.getElementById('stat-money').innerText = `$${resFinance.data.total_recaudado.toLocaleString('es-AR')}`;
    }
}

async function loadRecentLogs() {
    const res = await apiClient.get('/reports/access');
    if (!res.ok) return;

    const tbody = document.getElementById('live-logs');
    if (!tbody) return;

    tbody.innerHTML = res.data.slice(0, 10).map(log => {
        const date = new Date(log.fecha_hora);
        const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        const badgeColor = log.tipo_evento === 'ENTRADA' ? 'var(--secondary)' : 'var(--dorado)';
        const statusBadge = log.pago_confirmado ? 
            `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--secondary); padding: 4px 8px; border-radius: 6px; font-size: 0.7rem;">PAGADO</span>` : 
            `<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); padding: 4px 8px; border-radius: 6px; font-size: 0.7rem;">PENDIENTE</span>`;

        return `
            <tr>
                <td>${time}</td>
                <td><span class="plate-style" style="background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${log.patente_detectada}</span></td>
                <td style="color: ${badgeColor}; font-weight: 700;">${log.tipo_evento}</td>
                <td>${statusBadge}</td>
                <td><button class="btn-edit" onclick="showLogDetail(${log.id})" title="Ver captura"><i class="fas fa-eye"></i></button></td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" class="text-center py-20">No hay movimientos registrados hoy.</td></tr>';
}

async function loadOccupancy() {
    const res = await apiClient.get('/parking/current-occupancy');
    if (!res.ok) return;

    const tbody = document.getElementById('occ-list');
    if (!tbody) return;

    tbody.innerHTML = res.data.map(occ => {
        const date = new Date(occ.ingreso);
        const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        
        // Calcular permanencia (aprox)
        const diffMs = new Date() - date;
        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        const duration = `${diffHrs}h ${diffMins}m`;

        return `
            <tr>
                <td><span class="plate-style" style="background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${occ.patente}</span></td>
                <td>${time}</td>
                <td>${duration}</td>
                <td class="text-dorado text-bold">$${occ.deuda.toLocaleString('es-AR')}</td>
                <td>
                    <div class="flex-row gap-5">
                        <button class="btn btn-sm btn-primary" onclick="payOccupancy('${occ.patente}')">PAGAR</button>
                        <button class="btn btn-sm btn-outline btn-warning" onclick="manualExit('${occ.patente}')">SALIDA</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" class="text-center py-20">No hay vehículos en el predio.</td></tr>';
}

async function loadAdminReservations() {
    const res = await apiClient.get('/admin/reservations');
    if (!res.ok) return;

    const tbody = document.getElementById('admin-res-list');
    if (!tbody) return;

    tbody.innerHTML = res.data.map(r => {
        const pagoBadge = r.estado_pago === 'Pagado' ? 
            '<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: var(--secondary); padding: 4px 8px; border-radius: 6px;">PAGADO</span>' : 
            '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); padding: 4px 8px; border-radius: 6px;">PENDIENTE</span>';
        
        const statusColor = r.estado_reserva === 'Activa' ? 'var(--secondary)' : (r.estado_reserva === 'Pendiente' ? 'var(--dorado)' : '#888');

        return `
            <tr>
                <td><b>#${r.id}</b></td>
                <td>
                    <div class="flex-col" style="gap: 2px;">
                        <span class="text-bold">${r.user_name || 'Consumidor Final'}</span>
                        <span class="text-small" style="font-size: 0.7rem; color: #666;">${r.user_email || 'S/D'}</span>
                    </div>
                </td>
                <td><span class="plate-style" style="background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${r.patente}</span></td>
                <td>
                    <div class="text-small">
                        <div>${formatDate(r.fecha_inicio)}</div>
                        <div style="color: #666;">${formatDate(r.fecha_fin)}</div>
                    </div>
                </td>
                <td class="text-small">${r.sucursal_nombre}</td>
                <td><span class="badge" style="background: rgba(255,255,255,0.05); color: #ccc; text-transform: capitalize; padding: 2px 8px; border-radius: 4px;">${r.tipo_estadia}</span></td>
                <td class="text-bold">$${r.monto_total.toLocaleString('es-AR')}</td>
                <td>${pagoBadge}</td>
                <td><span style="color: ${statusColor}; font-weight: 800; font-size: 0.75rem;">${r.estado_reserva.toUpperCase()}</span></td>
            </tr>`;
    }).join('') || '<tr><td colspan="9" class="text-center py-20">No hay reservas registradas.</td></tr>';
}

async function loadUsers() {
    const res = await apiClient.get('/admin/users');
    if (!res.ok) return;

    const tbody = document.getElementById('user-list');
    if (!tbody) return;

    tbody.innerHTML = res.data.map(u => `
        <tr>
            <td class="text-bold">${u.nombre} ${u.apellido}</td>
            <td>${u.email}</td>
            <td>${u.dni}</td>
            <td><span class="badge" style="background: ${u.rol === 'admin' ? 'var(--dorado)' : 'rgba(255,255,255,0.1)'}; color: ${u.rol === 'admin' ? '#000' : '#fff'}; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; font-weight: 800;">${u.rol.toUpperCase()}</span></td>
            <td>${u.puntos_acumulados} pts</td>
            <td class="text-bold">$${u.saldo.toLocaleString('es-AR')}</td>
        </tr>
    `).join('');
}

async function loadFinanceData() {
    const resSummary = await apiClient.get('/reports/financial-summary?period=total');
    if (resSummary.ok) {
        document.getElementById('fin-total').innerText = `$${resSummary.data.total_recaudado.toLocaleString('es-AR')}`;
        document.getElementById('fin-count').innerText = resSummary.data.cantidad_pagos;
        document.getElementById('fin-avg').innerText = `$${resSummary.data.ticket_promedio.toLocaleString('es-AR')}`;
    }

    const resHistory = await apiClient.get('/reports/payment-history');
    if (resHistory.ok) {
        const tbody = document.getElementById('payment-list');
        tbody.innerHTML = resHistory.data.slice(0, 15).map(pay => `
            <tr>
                <td>${new Date(pay.fecha_hora).toLocaleString('es-AR')}</td>
                <td><span class="plate-style" style="background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${pay.patente_detectada}</span></td>
                <td class="text-bold">$${pay.costo_estadia.toLocaleString('es-AR')}</td>
                <td style="color: var(--secondary); font-weight: 700;">CONFIRMADO</td>
                <td>SALDO VIRTUAL</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center py-20">No hay transacciones registradas.</td></tr>';
    }
}

async function loadSettings() {
    const res = await apiClient.get('/admin/settings');
    if (res.ok) {
        const keys = ['precio_hora', 'precio_dia', 'precio_semana', 'precio_quincena', 'precio_mes', 'capacidad_total'];
        keys.forEach(k => {
            const input = document.getElementById(`cfg-${k}`);
            if (input) input.value = res.data[k] || 0;
        });
    }
}

// --- OPERATIONS ---

async function saveAllRates() {
    const rates = ['precio_hora', 'precio_dia', 'precio_semana', 'precio_quincena', 'precio_mes'];
    let successCount = 0;
    
    for (const r of rates) {
        const val = document.getElementById(`cfg-${r}`).value;
        const res = await apiClient.post(`/settings/prices?clave=${r}&valor=${val}`);
        if (res.ok) successCount++;
    }
    
    if (successCount === rates.length) showToast('Tarifario actualizado correctamente');
    else showToast('Algunas tarifas no se pudieron guardar');
}

async function saveSystemParam(key) {
    const val = document.getElementById(`cfg-${key}`).value;
    const res = await apiClient.post(`/settings/prices?clave=${key}&valor=${val}`);
    if (res.ok) showToast('Parámetro actualizado');
    else showToast(res.error);
}

async function manualEntry() {
    const plateInput = document.getElementById('manual-plate');
    const plate = plateInput.value.trim().toUpperCase();
    if (!plate) return showToast('Ingresá una patente');
    
    const confirm = await showConfirm('Registrar Ingreso', `¿Confirmás el ingreso manual del vehículo <b>${plate}</b>?`);
    if (!confirm) return;
    
    const res = await apiClient.post(`/admin/manual-entry?plate=${plate}`);
    if (res.ok) {
        showToast(`Vehículo ${plate} ingresado.`);
        plateInput.value = '';
        loadTabData('occupancy');
    } else {
        showToast(res.error);
    }
}

async function manualExit(prefillPlate = null) {
    const plate = prefillPlate || document.getElementById('manual-plate').value.trim().toUpperCase();
    if (!plate) return showToast('Ingresá una patente');
    
    const confirm = await showConfirm('Registrar Salida', `¿Confirmás la salida manual del vehículo <b>${plate}</b>?`);
    if (!confirm) return;
    
    const res = await apiClient.post(`/admin/manual-exit?plate=${plate}`);
    if (res.ok) {
        showToast(`Vehículo ${plate} egresado correctamente.`);
        loadTabData('occupancy');
    } else {
        showToast(res.error);
    }
}

async function payOccupancy(plate) {
    const res = await apiClient.post(`/access/pay-stay?plate=${plate}`);
    if (res.ok) {
        showToast(`Pago procesado con éxito para ${plate}.`);
        loadTabData('occupancy');
    } else {
        showToast(res.error);
    }
}

async function resetSys() {
    const confirm = await showConfirm('🚨 REINICIO INTEGRAL', '¿Estás absolutamente seguro? Se borrarán todos los datos, fotos y registros del sistema.');
    if (!confirm) return;
    
    const res = await apiClient.post('/admin/system/reset');
    if (res.ok) {
        showToast('Sistema reiniciado con éxito.');
        window.location.reload();
    } else {
        showToast(res.error);
    }
}

function filterTable(tableId, query) {
    const rows = document.getElementById(tableId).getElementsByTagName('tr');
    const q = query.toLowerCase();
    for (let row of rows) {
        row.style.display = row.innerText.toLowerCase().includes(q) ? '' : 'none';
    }
}

function openBarrier(type) {
    showToast(`Enviando señal de apertura a Barrera ${type}...`);
    // Implementación MQTT real si fuera necesario desde el frontend, 
    // pero usualmente se hace vía backend.
}
