/* --- LÓGICA DE GESTIÓN DE RESERVAS --- */

let historialCurrentPage = 1;
const HISTORIAL_PAGE_SIZE = 5;
let currentRates = { hora: 1500, dia: 15000, semana: 70000, quincena: 120000, mes: 200000 };
let editingReservaId = null;
let historyData = [];

/**
 * Despliega/Oculta el formulario de reserva y refresca su estado.
 */
async function toggleReservaForm() {
    const container = document.getElementById('reserva-form-container');
    const arrow = document.getElementById('reserva-form-arrow');
    if (!container) return;

    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';

    if (isOpen) {
        await refreshReservationFormState();
    } else {
        resetReservaForm();
    }
}

/**
 * Sincroniza tarifas y flota de vehículos para el formulario de reserva.
 */
async function refreshReservationFormState() {
    const container = document.getElementById('reserva-form-container');
    if (!container || !container.classList.contains('open')) return;

    fetchRates();
    try {
        const res = await fetch(`${API_BASE}/user/vehicles`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (!res.ok) return;
        const vehicles = await res.json();
        
        const noVehiclesSec = document.getElementById('reserva-no-vehicles');
        const mainForm = document.getElementById('reserva-form-content');

        if (vehicles.length === 0) {
            if (noVehiclesSec) noVehiclesSec.style.display = 'block';
            if (mainForm) mainForm.style.display = 'none';
        } else {
            if (noVehiclesSec) noVehiclesSec.style.display = 'none';
            if (mainForm) mainForm.style.display = 'block';
            const selects = document.querySelectorAll('.res-vehicle');
            selects.forEach(select => {
                const currentVal = select.value;
                select.innerHTML = '<option value="">Seleccioná vehículo...</option>' + 
                    vehicles.map(v => `<option value="${v.patente}">${v.patente} - ${v.marca_modelo}</option>`).join('');
                if (currentVal) select.value = currentVal;
            });
        }
    } catch (err) {
        console.error("Error al refrescar estado de reserva:", err);
    }
}

function showQuickAddVehicle() {
    const info = document.getElementById('quick-add-info');
    const form = document.getElementById('quick-add-form-container');
    if (info && form) {
        info.style.display = 'none';
        form.style.display = 'block';
        form.querySelector('input[name="patente"]').focus();
    }
}

function hideQuickAddVehicle() {
    const info = document.getElementById('quick-add-info');
    const form = document.getElementById('quick-add-form-container');
    if (info && form) {
        info.style.display = 'block';
        form.style.display = 'none';
    }
}

function resetReservaForm() {
    editingReservaId = null;
    const form = document.querySelector('.reservation-form-modern');
    if (form) form.reset();
    const btnSpan = document.querySelector('.btn-confirm-premium span');
    if (btnSpan) btnSpan.innerText = 'CONFIRMAR RESERVA';
    const headerTitle = document.querySelector('.header-text h3');
    if (headerTitle) headerTitle.innerText = 'GENERAR NUEVA RESERVA';
    updateReservationPrice();
}

/**
 * Prepara el formulario para editar una reserva existente.
 */
async function prepareEditReservation(id) {
    const res = await fetch(`${API_BASE}/user/reservations`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;
    const all = await res.json();
    const r = all.find(item => item.id === id);
    if (!r) return;

    // Validación de antelación (mínimo 2 horas)
    const now = new Date();
    const start = new Date(r.fecha_inicio.replace(/-/g, "/"));
    if ((start - now) < 7200000) {
        return showToast('No se puede modificar con menos de 2 horas de antelación');
    }

    editingReservaId = id;
    
    // Navegación automática al formulario
    const inicioNavItem = document.querySelector('.nav-item[onclick*="inicio"]');
    if (inicioNavItem && typeof showSection === 'function') {
        showSection('inicio', inicioNavItem);
    }

    const container = document.getElementById('reserva-form-container');
    if (!container.classList.contains('open')) await toggleReservaForm();
    container.scrollIntoView({ behavior: 'smooth' });

    document.querySelector('.header-text h3').innerText = `MODIFICAR RESERVA #${id}`;
    document.querySelector('.btn-confirm-premium span').innerText = 'ACTUALIZAR RESERVA';

    // Carga asíncrona de datos en campos
    setTimeout(() => {
        const vehicleSelect = document.querySelector('.res-vehicle');
        const sedeSelect = document.querySelector('.res-sede');
        const typeSelect = document.querySelector('.res-type');
        
        if (vehicleSelect) vehicleSelect.value = r.patente;
        if (sedeSelect) sedeSelect.value = r.sucursal_nombre;
        if (typeSelect) {
            typeSelect.value = r.tipo_estadia;
            updateFormGroups(r.tipo_estadia);
        }
        
        if (r.tipo_estadia === 'hora') {
            const dtParts = r.fecha_inicio.split(' ');
            document.querySelector('.res-date-only').value = dtParts[0];
            document.querySelector('.res-time-only').value = dtParts[1];
            const startDt = new Date(r.fecha_inicio.replace(/-/g, "/"));
            const endDt = new Date(r.fecha_fin.replace(/-/g, "/"));
            const hours = Math.round((endDt - startDt) / (1000 * 60 * 60));
            document.querySelector('.res-hours-qty').value = hours || 1;
        } else if (r.tipo_estadia === 'dia') {
            document.querySelector('.res-day-only').value = r.fecha_inicio.split(' ')[0];
        } else {
            const periodInputs = { 'semana': '.res-week-start', 'quincena': '.res-fortnight-start', 'mes': '.res-month-start' };
            const specificInput = document.querySelector(periodInputs[r.tipo_estadia]);
            if (specificInput) {
                specificInput.value = r.fecha_inicio.split(' ')[0];
                specificInput.dispatchEvent(new Event('change'));
            } else {
                document.querySelector('.res-start').value = r.fecha_inicio;
                document.querySelector('.res-end').value = r.fecha_fin;
            }
        }
        updateReservationPrice();
    }, 500);
}

/**
 * Obtiene las tarifas vigentes del servidor.
 */
async function fetchRates() {
    try {
        const res = await fetch(`${API_BASE}/admin/settings`);
        if (res.ok) {
            const settings = await res.json();
            if (settings.precio_hora) currentRates.hora = settings.precio_hora;
            if (settings.precio_dia) currentRates.dia = settings.precio_dia;
            if (settings.precio_semana) currentRates.semana = settings.precio_semana;
            if (settings.precio_quincena) currentRates.quincena = settings.precio_quincena;
            if (settings.precio_mes) currentRates.mes = settings.precio_mes;
        }
    } catch(e) {}
}

/**
 * Calcula y muestra el precio estimado de la reserva en tiempo real.
 */
function updateReservationPrice() {
    const typeSelect = document.querySelector('.res-type');
    if (!typeSelect) return;
    const type = typeSelect.value;
    const totalEl = document.getElementById('reserva-total-est');
    let total = 0;

    if (type === 'hora') {
        const hoursInput = document.querySelector('.res-hours-qty');
        total = (parseInt(hoursInput.value) || 0) * currentRates.hora;
    } else {
        total = currentRates[type] || 0;
    }

    if (totalEl) totalEl.innerText = total > 0 ? `$ ${total.toLocaleString()}` : '$ ---';
}

/**
 * Inicializa selectores de fecha y escuchadores del formulario.
 */
function initReservationForm() {
    const typeSelect = document.querySelector('.res-type');
    const dateOnlyInput = document.querySelector('.res-date-only');
    const dayOnlyInput = document.querySelector('.res-day-only');
    const weekStartInput = document.querySelector('.res-week-start');
    const hoursInput = document.querySelector('.res-hours-qty');
    
    if (!typeSelect) return;

    [typeSelect, hoursInput].forEach(el => {
        if(el) {
            el.addEventListener('change', updateReservationPrice);
            el.addEventListener('input', updateReservationPrice);
        }
    });

    if (dateOnlyInput) flatpickr(dateOnlyInput, { dateFormat: "Y-m-d", minDate: "today", theme: "dark", onChange: updateReservationPrice });
    if (dayOnlyInput) flatpickr(dayOnlyInput, { dateFormat: "Y-m-d", minDate: "today", theme: "dark", onChange: updateReservationPrice });

    const setAutoEnd = (input, endSelector, days) => {
        if (!input) return;
        flatpickr(input, {
            dateFormat: "Y-m-d", minDate: "today", theme: "dark",
            onChange: function(selectedDates) {
                if (selectedDates.length > 0) {
                    const end = new Date(selectedDates[0].getTime() + days * 24 * 60 * 60 * 1000);
                    const y = end.getFullYear();
                    const m = (end.getMonth() + 1).toString().padStart(2, '0');
                    const d = end.getDate().toString().padStart(2, '0');
                    const endInputEl = document.querySelector(endSelector);
                    if (endInputEl) endInputEl.value = `${d}/${m}/${y}`;
                }
                updateReservationPrice();
            }
        });
    };

    if (weekStartInput) setAutoEnd(weekStartInput, '.res-week-end', 7);
    if (document.querySelector('.res-fortnight-start')) setAutoEnd(document.querySelector('.res-fortnight-start'), '.res-fortnight-end', 15);
    if (document.querySelector('.res-month-start')) setAutoEnd(document.querySelector('.res-month-start'), '.res-month-end', 30);

    const startInput = document.querySelector('.res-start');
    if (startInput) flatpickr(startInput, { enableTime: true, dateFormat: "Y-m-d H:i", minDate: "today", theme: "dark", onChange: updateReservationPrice });

    typeSelect.addEventListener('change', (e) => updateFormGroups(e.target.value));
    updateFormGroups(typeSelect.value);
}

function updateFormGroups(type) {
    const sections = {
        'hora': document.getElementById('hourly-fields'),
        'dia': document.getElementById('daily-fields'),
        'semana': document.getElementById('weekly-fields'),
        'quincena': document.getElementById('fortnight-fields'),
        'mes': document.getElementById('month-fields'),
        'standard': document.getElementById('standard-fields')
    };

    Object.values(sections).forEach(s => { if(s) s.style.display = 'none'; });
    const activeSection = sections[type] || sections['standard'];
    if (activeSection) activeSection.style.display = 'grid';
    updateReservationPrice();
}

/**
 * Procesa el envío del formulario para crear o actualizar una reserva.
 */
async function createReservation(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalContent = btn.innerHTML;
    
    const patente = e.target.querySelector('.res-vehicle').value;
    const sucursal = e.target.querySelector('.res-sede').value;
    const tipo = e.target.querySelector('.res-type').value;
    
    if (!patente) return showToast('Seleccioná un vehículo');

    let inicio, fin;

    // Lógica de cálculo de periodos
    if (tipo === 'hora') {
        const fecha = e.target.querySelector('.res-date-only').value;
        const hora = e.target.querySelector('.res-time-only').value;
        const hoursQty = parseInt(e.target.querySelector('.res-hours-qty').value) || 1;
        if (!fecha || !hora) return showToast('Seleccioná fecha y hora');
        inicio = `${fecha} ${hora}`;
        const endDt = new Date(new Date(inicio.replace(/-/g, "/")).getTime() + hoursQty * 60 * 60 * 1000);
        fin = `${endDt.getFullYear()}-${(endDt.getMonth() + 1).toString().padStart(2, '0')}-${endDt.getDate().toString().padStart(2, '0')} ${endDt.getHours().toString().padStart(2, '0')}:${endDt.getMinutes().toString().padStart(2, '0')}`;
    } else if (tipo === 'dia') {
        const fecha = e.target.querySelector('.res-day-only').value;
        if (!fecha) return showToast('Seleccioná un día');
        inicio = `${fecha} 00:00`;
        fin = `${fecha} 23:59`;
    } else {
        const periods = { 'semana': 7, 'quincena': 15, 'mes': 30 };
        if (periods[tipo]) {
            const fecha = e.target.querySelector(`.res-${tipo}-start`).value;
            if (!fecha) return showToast('Seleccioná día de inicio');
            inicio = `${fecha} 00:00`;
            const endDt = new Date(new Date(fecha.replace(/-/g, "/")).getTime() + periods[tipo] * 24 * 60 * 60 * 1000);
            fin = `${endDt.getFullYear()}-${(endDt.getMonth() + 1).toString().padStart(2, '0')}-${endDt.getDate().toString().padStart(2, '0')} 23:59`;
        } else {
            inicio = e.target.querySelector('.res-start').value;
            fin = e.target.querySelector('.res-end').value;
        }
    }

    const resumenHtml = `
        <div style="text-align: left; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 15px; border: 1px solid rgba(197,160,89,0.2); margin-top: 10px;">
            <div style="margin-bottom: 12px;"><i class="fas fa-car" style="color: var(--dorado);"></i> Vehículo: <b style="color: #fff;">${patente}</b></div>
            <div style="margin-bottom: 12px;"><i class="fas fa-location-dot" style="color: var(--dorado);"></i> Sucursal: <b style="color: #fff;">${sucursal}</b></div>
            <div style="margin-bottom: 12px;"><i class="fas fa-calendar-day" style="color: var(--dorado);"></i> Estadía: <b style="color: #fff; text-transform: capitalize;">${tipo}</b></div>
            <div style="margin-bottom: 12px;"><i class="fas fa-clock" style="color: var(--dorado);"></i> Desde: <b style="color: #eee;">${formatDate(inicio)}</b></div>
            <div style="margin-bottom: 12px;"><i class="fas fa-hourglass-end" style="color: var(--dorado);"></i> Hasta: <b style="color: #eee;">${formatDate(fin)}</b></div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between;">
                <span style="font-weight: 800;">TOTAL:</span>
                <b style="color: var(--dorado); font-size: 1.2rem;">${document.getElementById('reserva-total-est').innerText}</b>
            </div>
        </div>`;

    if (!await showConfirm('REVISÁ TU RESERVA', resumenHtml)) return;

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> PROCESANDO...';
    btn.disabled = true;

    try {
        const url = editingReservaId ? `${API_BASE}/user/reservations/${editingReservaId}` : `${API_BASE}/user/reservations`;
        const res = await fetch(url, {
            method: editingReservaId ? 'PATCH' : 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ patente, fecha_inicio: inicio, fecha_fin: fin, sucursal_nombre: sucursal, tipo_estadia: tipo })
        });

        if (res.ok) {
            showToast(editingReservaId ? '¡Reserva actualizada!' : '¡Reserva creada con éxito!');
            resetReservaForm(); toggleReservaForm(); loadReservations();
            if (typeof loadProfile === 'function') loadProfile();
        } else {
            const data = await res.json();
            showToast(data.detail || 'Error al procesar reserva');
        }
    } catch (err) {
        showToast('Error de conexión');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

/**
 * Obtiene y renderiza la lista de reservas activas e históricas.
 */
async function loadReservations() {
    const res = await fetch(`${API_BASE}/user/reservations`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;
    
    const all = await res.json();
    const active = all.filter(r => r.estado_reserva === 'Pendiente' || r.estado_reserva === 'Activa');
    historyData = all.filter(r => r.estado_reserva !== 'Pendiente' && r.estado_reserva !== 'Activa');
    
    const now = new Date();
    const inProgress = active.filter(r => now >= new Date(r.fecha_inicio.replace(/-/g, "/")) && now < new Date(r.fecha_fin.replace(/-/g, "/")));
    const upcoming = active.filter(r => now < new Date(r.fecha_inicio.replace(/-/g, "/")));

    if (document.getElementById('stat-reservations')) document.getElementById('stat-reservations').innerText = active.length;
    if (document.getElementById('stat-res-active')) document.getElementById('stat-res-active').innerText = inProgress.length;
    if (document.getElementById('stat-res-upcoming')) document.getElementById('stat-res-upcoming').innerText = upcoming.length;

    const featuredList = document.getElementById('reservation-featured-list');
    if (inProgress.length > 0) {
        document.getElementById('container-res-featured').style.display = 'block';
        if (featuredList) featuredList.innerHTML = renderReservaCard(inProgress[0], true);
    } else {
        document.getElementById('container-res-featured').style.display = 'none';
    }

    const activeList = document.getElementById('reservation-list-active');
    const listToRender = active.filter(r => inProgress.length > 0 ? r.id !== inProgress[0].id : true);

    if (activeList) {
        if (listToRender.length === 0 && inProgress.length === 0) {
            activeList.style.display = 'block';
            activeList.innerHTML = `<div class="empty-state-minimal" style="padding:40px;"><i class="fas fa-calendar-xmark" style="font-size:3rem;color:#222;margin-bottom:15px;"></i><p>No tenés reservas activas.</p></div>`;
        } else {
            activeList.style.display = 'grid';
            activeList.innerHTML = listToRender.map(r => renderReservaCard(r, false)).join('');
        }
    }
    applyHistoryFilters();
}

function applyHistoryFilters() {
    const fromVal = document.getElementById('history-filter-from').value;
    const toVal = document.getElementById('history-filter-to').value;
    let filtered = [...historyData];
    
    if (fromVal) {
        const d = new Date(fromVal); d.setHours(0,0,0,0);
        filtered = filtered.filter(r => new Date(r.fecha_inicio.replace(/-/g, "/")) >= d);
    }
    if (toVal) {
        const d = new Date(toVal); d.setHours(23,59,59,999);
        filtered = filtered.filter(r => new Date(r.fecha_inicio.replace(/-/g, "/")) <= d);
    }
    renderHistory(filtered);
}

function resetHistoryFilters() {
    document.getElementById('history-filter-from').value = '';
    document.getElementById('history-filter-to').value = '';
    historialCurrentPage = 1;
    applyHistoryFilters();
}

/**
 * Genera el HTML para una tarjeta de reserva.
 */
function renderReservaCard(r, isFeatured) {
    const now = new Date();
    const start = new Date(r.fecha_inicio.replace(/-/g, "/"));
    const end = new Date(r.fecha_fin.replace(/-/g, "/"));
    let progress = 0;
    let isStarted = now >= start;
    if (isStarted) progress = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));

    return `
    <div class="reserva-card-ultra ${isFeatured ? 'featured' : ''}">
        <div class="reserva-header-ultra">
            <div class="reserva-info-main">
                <span class="reserva-tag-id">RESERVA #${r.id}</span>
                <div class="reserva-plate-container">
                    <div class="plate-badge-premium">${r.patente}</div>
                    ${isStarted && progress < 100 ? '<span class="status-badge-ultra active-pulse" style="background:rgba(16,185,129,0.1);color:#10b981;border:1px solid #10b981;">EN CURSO</span>' : ''}
                </div>
            </div>
            <div class="reserva-status-ultra">
                <div class="status-badge-ultra ${r.estado_pago.toLowerCase()}">${r.estado_pago}</div>
                <div class="price-container-ultra"><span class="price-value-ultra">$${r.monto_total.toLocaleString()}</span></div>
            </div>
        </div>
        <div class="reserva-timeline-container">
            <div class="timeline-labels"><span>${isStarted ? 'INGRESO' : 'INICIO'}</span><span>${isStarted ? (progress >= 100 ? 'FINALIZADA' : `PROGRESO: ${Math.round(progress)}%`) : ''}</span><span>${isStarted ? 'SALIDA' : 'FIN'}</span></div>
            <div class="timeline-progress-bg"><div class="timeline-progress-fill ${isStarted ? 'active' : ''}" style="width: ${isStarted ? progress : 0}%"></div></div>
        </div>
        <div class="reserva-details-ultra" ${isFeatured ? 'style="grid-template-columns: repeat(4, 1fr);"' : ''}>
            <div class="detail-item-ultra"><i class="fas fa-location-dot"></i><div class="detail-info-ultra"><span class="detail-label-ultra">Sucursal</span><span class="detail-value-ultra">${r.sucursal_nombre}</span></div></div>
            <div class="detail-item-ultra"><i class="fas fa-calendar-day"></i><div class="detail-info-ultra"><span class="detail-label-ultra">Estadía</span><span class="detail-value-ultra">${toTitle(r.tipo_estadia)}</span></div></div>
            <div class="detail-item-ultra"><i class="fas fa-clock"></i><div class="detail-info-ultra"><span class="detail-label-ultra">Desde</span><span class="detail-value-ultra">${formatDate(r.fecha_inicio)}</span></div></div>
            <div class="detail-item-ultra"><i class="fas fa-hourglass-end"></i><div class="detail-info-ultra"><span class="detail-label-ultra">Hasta</span><span class="detail-value-ultra">${formatDate(r.fecha_fin)}</span></div></div>
        </div>
        <div class="reserva-actions-ultra">
            ${r.estado_pago === 'Pagado' ? `<button class="btn-ultra btn-ultra-primary" onclick="showDigitalPass(${r.id})"><i class="fas fa-ticket"></i> MI PASE DIGITAL</button>` : `<button class="btn-ultra btn-ultra-primary" onclick="payReservation(${r.id})"><i class="fas fa-credit-card"></i> PAGAR AHORA</button>`}
            <button class="btn-ultra btn-ultra-secondary" onclick="prepareEditReservation(${r.id})" ${isStarted ? 'disabled' : ''}><i class="fas fa-pen"></i></button>
            <button class="btn-ultra btn-ultra-danger" onclick="cancelReservation(${r.id})" ${isStarted ? 'disabled' : ''}><i class="fas fa-trash"></i></button>
        </div>
    </div>`;
}

/**
 * Gestión de Pase Digital con QR.
 */
async function showDigitalPass(id) {
    const res = await fetch(`${API_BASE}/user/reservations`, { headers: { 'Authorization': `Bearer ${token}` } });
    const r = (await res.json()).find(item => item.id === id);
    if (!r) return;

    document.getElementById('ticket-id-display').innerText = `#${r.id.toString().padStart(6, '0')}`;
    document.getElementById('ticket-patente').innerText = r.patente;
    document.getElementById('ticket-vence').innerText = formatDate(r.fecha_fin).split(',')[0];
    document.getElementById('ticket-sucursal').innerText = r.sucursal_nombre;
    document.getElementById('ticket-direccion').innerText = r.sucursal_info || 'Dirección no disponible';

    const qrContainer = document.getElementById('ticket-qr');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, { text: `AUTOPASS|ID:${r.id}|PLATE:${r.patente}`, width: 180, height: 180, correctLevel: QRCode.CorrectLevel.H });
    document.getElementById('modal-pase-digital').style.display = 'flex';
}

function closeDigitalPass() { document.getElementById('modal-pase-digital').style.display = 'none'; }

async function shareTicket() {
    const ticket = document.getElementById('ticket-to-capture');
    ticket.querySelectorAll('.no-print').forEach(el => el.style.opacity = '0');
    try {
        const canvas = await html2canvas(ticket, { backgroundColor: '#0a0a0a', scale: 3, useCORS: true });
        canvas.toBlob(async (blob) => {
            const file = new File([blob], `AutoPass_Ticket_${Date.now()}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'Mi Pase AutoPass' });
            } else {
                const link = document.createElement('a');
                link.download = `AutoPass_Ticket_${Date.now()}.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
            }
        });
    } catch (err) { showToast('Error al generar imagen'); }
    finally { ticket.querySelectorAll('.no-print').forEach(el => el.style.opacity = '1'); }
}

function renderHistory(history) {
    const list = document.getElementById('reservation-list-history');
    if (!list) return;
    const totalPages = Math.ceil(history.length / HISTORIAL_PAGE_SIZE);
    if (history.length === 0) { list.innerHTML = '<p class="text-muted" style="padding:30px;">No hay historial.</p>'; return; }

    const paged = history.slice((historialCurrentPage - 1) * HISTORIAL_PAGE_SIZE, historialCurrentPage * HISTORIAL_PAGE_SIZE);
    list.innerHTML = paged.map(r => `
        <div class="historial-item">
            <div class="hist-icon"><i class="fas ${r.estado_reserva === 'Completada' ? 'fa-car-circle-check' : 'fa-ban'}"></i></div>
            <div class="hist-main-info"><span class="hist-title">${r.sucursal_nombre}</span><div class="hist-subtitle-group"><span class="hist-plate-badge">${r.patente}</span><span class="hist-date-info">${formatDate(r.fecha_inicio).split(',')[0]}</span></div></div>
            <div class="hist-amount-info"><span class="hist-value">$${r.monto_total.toLocaleString()}</span><div class="status-pill ${r.estado_reserva.toLowerCase()}">${r.estado_reserva}</div></div>
            <div class="hist-actions-group"><button class="btn-repeat-express" onclick="repeatReservation('${r.patente}','${r.sucursal_nombre}','${r.tipo_estadia}')"><i class="fas fa-rotate-right"></i></button></div>
        </div>`).join('');

    if (document.getElementById('historial-page-info')) document.getElementById('historial-page-info').innerText = `Página ${historialCurrentPage} de ${totalPages || 1}`;
    document.getElementById('historial-prev').disabled = historialCurrentPage === 1;
    document.getElementById('historial-next').disabled = historialCurrentPage >= totalPages;
}

async function repeatReservation(patente, sucursal, tipo) {
    showSection('inicio', document.querySelector('.nav-item[onclick*="inicio"]'));
    if (!document.getElementById('reserva-form-container').classList.contains('open')) await toggleReservaForm();
    document.getElementById('reserva-form-container').scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
        document.querySelector('.res-vehicle').value = patente;
        document.querySelector('.res-sede').value = sucursal;
        document.querySelector('.res-type').value = tipo;
        updateFormGroups(tipo);
        showToast('¡Datos cargados! Seleccioná la nueva fecha.');
    }, 500);
}

function historialPage(dir) { historialCurrentPage += dir; applyHistoryFilters(); }

async function cancelReservation(id) {
    if (!await showConfirm('CANCELAR RESERVA', '¿Estás seguro? Esta acción no se puede deshacer.')) return;
    try {
        const res = await fetch(`${API_BASE}/user/reservations/${id}/cancel`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast('Reserva cancelada'); loadReservations(); if (typeof loadProfile === 'function') loadProfile(); }
    } catch (err) { showToast('Error de conexión'); }
}

async function payReservation(id) {
    if (!await showConfirm('PAGAR RESERVA', '¿Deseás pagar con tu saldo AutoPass?')) return;
    try {
        const res = await fetch(`${API_BASE}/user/reservations/${id}/pay`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) { showToast('¡Pago exitoso!'); loadReservations(); if (typeof loadProfile === 'function') loadProfile(); }
        else { showToast((await res.json()).detail || 'Error en el pago'); }
    } catch (err) { showToast('Error de conexión'); }
}

function toggleHistorial() {
    const container = document.getElementById('historial-container');
    const arrow = document.getElementById('historial-arrow');
    if (!container) return;
    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

// Refresco automático de estados
setInterval(() => {
    if (token && (document.getElementById('section-reservas')?.classList.contains('active') || document.getElementById('section-inicio')?.classList.contains('active'))) {
        loadReservations();
    }
}, 60000);
