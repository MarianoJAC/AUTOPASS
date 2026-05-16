/**
 * AUTOPASS Professional Dashboard Logic
 * Handles tab switching, real-time updates, and administrative actions.
 */

let revenueChart = null;

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
        if (res.data.status === 'ok') dot.classList.add('online');
        else dot.classList.remove('online');
    } else {
        dot.style.background = '#ef4444';
        dot.classList.remove('online');
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
            'admin-reservations': 'Reservas',
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

    const data = res.data;
    const tbody = document.getElementById('occ-list');
    if (!tbody) return;

    // Calcular KPIs
    const totalCount = data.length;
    let totalDebt = 0;
    let totalMs = 0;

    tbody.innerHTML = data.map(occ => {
        const date = new Date(occ.ingreso);
        const time = date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        
        const diffMs = new Date() - date;
        totalMs += diffMs;
        totalDebt += occ.deuda;

        const diffHrs = Math.floor(diffMs / 3600000);
        const diffMins = Math.floor((diffMs % 3600000) / 60000);
        const duration = `${diffHrs}h ${diffMins}m`;

        const statusBadge = occ.ya_pago ? 
            `<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);">PAGO CONFIRMADO</span>` :
            `<span class="badge" style="background: rgba(197, 160, 89, 0.1); color: var(--dorado); border: 1px solid rgba(197, 160, 89, 0.2);">$${occ.deuda.toLocaleString('es-AR')} PENDIENTE</span>`;

        const typeIcon = occ.es_reserva ? 
            `<i class="fas fa-calendar-check" title="Reserva Activa" style="color: var(--secondary); margin-right: 8px;"></i>` : 
            `<i class="fas fa- car-side" title="Ingreso al paso" style="color: #666; margin-right: 8px;"></i>`;

        return `
            <tr>
                <td>
                    <div class="flex-row items-center">
                        ${typeIcon}
                        <span class="plate-style" style="background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${occ.patente}</span>
                    </div>
                </td>
                <td>${time}</td>
                <td style="font-weight: 600; color: #eee;">${duration}</td>
                <td>${statusBadge}</td>
                <td>
                    <div class="flex-row gap-5">
                        ${!occ.ya_pago ? `<button class="btn-icon-premium sm" onclick="payOccupancy('${occ.patente}')" title="Procesar Pago"><i class="fas fa-cash-register"></i></button>` : ''}
                        <button class="btn-icon-premium sm warning" onclick="manualExit('${occ.patente}')" title="Registrar Salida"><i class="fas fa-door-open"></i></button>
                    </div>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="5" class="text-center py-20">No hay vehículos en el predio.</td></tr>';

    // Actualizar KPIs en la UI
    document.getElementById('occ-stat-count').innerText = totalCount;
    document.getElementById('occ-stat-debt').innerText = `$${totalDebt.toLocaleString('es-AR')}`;
    
    if (totalCount > 0) {
        const avgMs = totalMs / totalCount;
        const avgHrs = Math.floor(avgMs / 3600000);
        const avgMins = Math.floor((avgMs % 3600000) / 60000);
        document.getElementById('occ-stat-avg-time').innerText = `${avgHrs}h ${avgMins}m`;
    } else {
        document.getElementById('occ-stat-avg-time').innerText = '--';
    }
}

async function loadAdminReservations() {
    const sucursal = document.getElementById('admin-res-filter-sucursal')?.value || '';
    const res = await apiClient.get(`/admin/reservations${sucursal ? '?sucursal=' + encodeURIComponent(sucursal) : ''}`);
    if (!res.ok) return;

    const data = res.data;
    const tbody = document.getElementById('admin-res-list');
    if (!tbody) return;

    // Calcular KPIs
    const totalCount = data.length;
    let pendingToday = 0;
    let totalProjectedRevenue = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    tbody.innerHTML = data.map(r => {
        totalProjectedRevenue += r.monto_total;
        if (r.fecha_inicio.startsWith(todayStr) && r.estado_reserva === 'Pendiente') {
            pendingToday++;
        }

        const pagoBadge = r.estado_pago === 'Pagado' ? 
            '<span class="badge" style="background: rgba(16, 185, 129, 0.1); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.2);">PAGADO</span>' : 
            '<span class="badge" style="background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2);">PENDIENTE</span>';
        
        const statusColors = {
            'Pendiente': 'var(--dorado)',
            'Activa': 'var(--secondary)',
            'Completada': '#888',
            'Cancelada': 'var(--danger)'
        };
        const statusColor = statusColors[r.estado_reserva] || '#ccc';

        return `
            <tr>
                <td><b>#${r.id}</b></td>
                <td>
                    <div class="flex-col" style="gap: 2px;">
                        <span class="text-bold">${r.user_name || 'Consumidor Final'}</span>
                        <span class="text-small" style="font-size: 0.7rem; color: #666;">${r.user_email || 'Manual / Externo'}</span>
                    </div>
                </td>
                <td><span class="plate-style" style="background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${r.patente}</span></td>
                <td>
                    <div class="text-small">
                        <div style="color: #eee;">${formatDate(r.fecha_inicio)}</div>
                        <div style="color: #666;">${formatDate(r.fecha_fin)}</div>
                    </div>
                </td>
                <td>
                    <div class="flex-col">
                        <span class="text-bold" style="font-size: 0.8rem;">${r.sucursal_nombre}</span>
                        <span class="badge" style="background: rgba(255,255,255,0.05); color: #ccc; text-transform: capitalize; width: fit-content; margin-top: 4px;">${r.tipo_estadia}</span>
                    </div>
                </td>
                <td class="text-dorado text-bold">$${r.monto_total.toLocaleString('es-AR')}</td>
                <td>${pagoBadge}</td>
                <td><span style="color: ${statusColor}; font-weight: 800; font-size: 0.75rem; text-transform: uppercase;">${r.estado_reserva}</span></td>
                <td>
                    <div class="flex-row gap-5">
                        ${(r.estado_pago !== 'Pagado' && r.estado_reserva !== 'Cancelada' && r.estado_reserva !== 'Completada') ? `<button class="btn-icon-premium sm" onclick="confirmPaymentAdmin(${r.id})" title="Confirmar Pago"><i class="fas fa-check-double"></i></button>` : ''}
                        ${(r.estado_reserva !== 'Cancelada' && r.estado_reserva !== 'Completada') ? `<button class="btn-icon-premium sm danger" onclick="cancelReservationAdmin(${r.id})" title="Cancelar Reserva"><i class="fas fa-xmark"></i></button>` : ''}
                    </div>
                </td>
            </tr>`;
    }).join('') || '<tr><td colspan="9" class="text-center py-20">No hay reservas registradas.</td></tr>';

    // Actualizar KPIs
    document.getElementById('admin-res-stat-total').innerText = totalCount;
    document.getElementById('admin-res-stat-pending').innerText = pendingToday;
    document.getElementById('admin-res-stat-revenue').innerText = `$${totalProjectedRevenue.toLocaleString('es-AR')}`;
}

async function confirmPaymentAdmin(id) {
    const confirm = await showConfirm('Confirmar Pago', `¿Confirmás el pago manual para la reserva <b>#${id}</b>?`);
    if (!confirm) return;

    const res = await apiClient.post(`/admin/reservations/${id}/confirm-payment`);
    if (res.ok) {
        showToast(`Reserva #${id} marcada como PAGADA.`);
        loadAdminReservations();
    } else {
        showToast(res.error);
    }
}

async function cancelReservationAdmin(id) {
    const confirm = await showConfirm('Cancelar Reserva', `¿Estás seguro de cancelar la reserva <b>#${id}</b>? Esta acción es irreversible.`);
    if (!confirm) return;

    const res = await apiClient.post(`/admin/reservations/${id}/cancel`);
    if (res.ok) {
        showToast(`Reserva #${id} cancelada.`);
        loadAdminReservations();
    } else {
        showToast(res.error);
    }
}

async function loadUsers() {
    const res = await apiClient.get('/admin/users');
    if (!res.ok) return;

    const users = res.data;
    const tbody = document.getElementById('user-list');
    if (!tbody) return;

    // Actualizar KPIs
    const totalUsers = users.length;
    const adminUsers = users.filter(u => u.rol === 'admin').length;
    const today = new Date().toISOString().split('T')[0];
    const newUsersToday = users.filter(u => u.created_at && u.created_at.startsWith(today)).length;

    document.getElementById('stat-total-users').innerText = totalUsers;
    document.getElementById('stat-admin-users').innerText = adminUsers;
    document.getElementById('stat-new-users').innerText = newUsersToday;

    tbody.innerHTML = users.map(u => {
        const rolBadge = u.rol === 'admin' ? 
            `<span class="badge" style="background: var(--dorado); color: #000; font-weight: 800;">ADMIN</span>` : 
            `<span class="badge" style="background: rgba(255,255,255,0.05); color: #ccc;">USUARIO</span>`;

        return `
            <tr>
                <td>
                    <div class="flex-col">
                        <span class="text-bold">${u.nombre} ${u.apellido}</span>
                        <span style="font-size: 0.7rem; color: #666;">DNI: ${u.dni}</span>
                    </div>
                </td>
                <td>
                    <div class="flex-col" style="gap: 2px;">
                        <div style="font-size: 0.85rem; color: #eee;"><i class="fas fa-envelope" style="width: 15px; color: var(--dorado);"></i> ${u.email}</div>
                        <div style="font-size: 0.75rem; color: #888;"><i class="fas fa-phone" style="width: 15px;"></i> ${u.telefono || 'S/D'}</div>
                    </div>
                </td>
                <td><span class="text-small">${u.dni}</span></td>
                <td>${rolBadge}</td>
                <td><b style="color: var(--dorado);">${u.puntos_acumulados || 0}</b> <small>pts</small></td>
                <td class="text-bold">$${u.saldo.toLocaleString('es-AR')}</td>
                <td>
                    <div class="flex-row gap-5">
                        <button class="btn-icon-premium sm" onclick="adjustUserBalance(${u.id}, '${u.nombre}')" title="Ajustar Saldo">
                            <i class="fas fa-wallet"></i>
                        </button>
                        <button class="btn-icon-premium sm" onclick="changeUserRole(${u.id}, '${u.rol}')" title="Cambiar Rol">
                            <i class="fas fa-user-shield"></i>
                        </button>
                        <button class="btn-icon-premium sm danger" onclick="deleteUserAdmin(${u.id})" title="Eliminar">
                            <i class="fas fa-trash-can"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadFinanceData() {
    const period = document.getElementById('fin-period')?.value || 'total';
    const resSummary = await apiClient.get(`/reports/financial-summary?period=${period}`);
    
    if (resSummary.ok) {
        document.getElementById('fin-total').innerText = `$${resSummary.data.total_recaudado.toLocaleString('es-AR')}`;
        document.getElementById('fin-count').innerText = resSummary.data.cantidad_pagos;
        document.getElementById('fin-avg').innerText = `$${resSummary.data.ticket_promedio.toLocaleString('es-AR')}`;
        
        // Inicializar o actualizar gráfico
        updateRevenueChart(period);
    }

    const resHistory = await apiClient.get('/reports/payment-history');
    if (resHistory.ok) {
        const tbody = document.getElementById('payment-list');
        tbody.innerHTML = resHistory.data.slice(0, 15).map(pay => `
            <tr>
                <td>${new Date(pay.fecha_hora).toLocaleString('es-AR')}</td>
                <td><span class="plate-style" style="background: #1e293b; color: #fff; padding: 4px 8px; border-radius: 4px; font-family: var(--font-mono); font-weight: 700;">${pay.patente_detectada}</span></td>
                <td class="text-bold">$${pay.costo_estadia.toLocaleString('es-AR')}</td>
                <td><span class="badge" style="background:rgba(255,255,255,0.05); color:#ccc;">SALDO VIRTUAL</span></td>
                <td style="color: var(--secondary); font-weight: 700;">CONFIRMADO</td>
            </tr>
        `).join('') || '<tr><td colspan="5" class="text-center py-20">No hay transacciones registradas.</td></tr>';
    }
}

/**
 * Genera o actualiza el gráfico de tendencia de ingresos.
 */
function updateRevenueChart(period) {
    const ctx = document.getElementById('revenueChart')?.getContext('2d');
    if (!ctx) return;

    // Datos simulados por ahora para mostrar la estética
    const labels = period === 'day' ? ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00'] : 
                   period === 'week' ? ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'] : 
                   ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul'];
    
    const dataValues = [12000, 19000, 15000, 25000, 22000, 30000, 28000];

    if (revenueChart) revenueChart.destroy();

    revenueChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Ingresos ($)',
                data: dataValues,
                borderColor: '#C5A059',
                backgroundColor: 'rgba(197, 160, 89, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointBackgroundColor: '#C5A059'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#888' } },
                x: { grid: { display: false }, ticks: { color: '#888' } }
            }
        }
    });
}

async function loadSettings() {
    const res = await apiClient.get('/admin/settings');
    if (res.ok) {
        const keys = ['precio_hora', 'precio_dia', 'precio_semana', 'precio_quincena', 'precio_mes', 'capacidad_total'];
        keys.forEach(k => {
            const input = document.getElementById(`cfg-${k}`);
            if (input && res.data[k] !== undefined) input.value = res.data[k];
        });
    }

    // Si capacidad_total no está en settings, traerla de /parking/status
    const capInput = document.getElementById('cfg-capacidad_total');
    if (capInput && (!capInput.value || capInput.value == 0)) {
        const resStatus = await apiClient.get('/parking/status');
        if (resStatus.ok) {
            capInput.value = resStatus.data.capacidad_total;
        }
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
