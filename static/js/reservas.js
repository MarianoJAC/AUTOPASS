// --- LÓGICA DE RESERVAS ---

let historialCurrentPage = 1;
const HISTORIAL_PAGE_SIZE = 5;
let currentRates = { hora: 1500, dia: 15000, semana: 70000, quincena: 120000, mes: 200000 };
let editingReservaId = null;
let historyData = []; // Almacena el historial completo para filtrar localmente

async function toggleReservaForm() {
    const container = document.getElementById('reserva-form-container');
    const arrow = document.getElementById('reserva-form-arrow');
    if (!container) return;

    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';

    if (isOpen) {
        // Cargar tarifas y vehículos
        fetchRates();
        const res = await fetch(`${API_BASE}/user/vehicles`, { headers: { 'Authorization': `Bearer ${token}` } });
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
                select.innerHTML = '<option value="">Seleccioná vehículo...</option>' + 
                    vehicles.map(v => `<option value="${v.patente}">${v.patente} - ${v.marca_modelo}</option>`).join('');
            });
        }
    } else {
        resetReservaForm();
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

async function prepareEditReservation(id) {
    const res = await fetch(`${API_BASE}/user/reservations`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;
    const all = await res.json();
    const r = all.find(item => item.id === id);
    if (!r) return;

    // Verificar límite (2 horas antes)
    const now = new Date();
    const start = new Date(r.fecha_inicio.replace(/-/g, "/"));
    if ((start - now) < 7200000) {
        return showToast('No se puede modificar una reserva con menos de 2 horas de antelación');
    }

    editingReservaId = id;
    
    // Cambiar a la sección de inicio si no estamos ahí (porque el form está ahí)
    const inicioNavItem = document.querySelector('.nav-item[onclick*="inicio"]');
    if (inicioNavItem && typeof showSection === 'function') {
        showSection('inicio', inicioNavItem);
    }

    // Abrir formulario si está cerrado
    const container = document.getElementById('reserva-form-container');
    if (!container.classList.contains('open')) {
        await toggleReservaForm();
    }

    // Scroll al form
    container.scrollIntoView({ behavior: 'smooth' });

    // Cambiar UI
    const headerTitle = document.querySelector('.header-text h3');
    if (headerTitle) headerTitle.innerText = `MODIFICAR RESERVA #${id}`;
    
    const btnSpan = document.querySelector('.btn-confirm-premium span');
    if (btnSpan) btnSpan.innerText = 'ACTUALIZAR RESERVA';

    // Pre-cargar datos
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
        
        // Cargar fechas (formato depende del tipo)
        if (r.tipo_estadia === 'hora') {
            const dtParts = r.fecha_inicio.split(' ');
            const dateInput = document.querySelector('.res-date-only');
            const timeInput = document.querySelector('.res-time-only');
            const hoursInput = document.querySelector('.res-hours-qty');
            
            if (dateInput) dateInput.value = dtParts[0];
            if (timeInput) timeInput.value = dtParts[1];
            
            // Calcular horas entre inicio y fin
            const startDt = new Date(r.fecha_inicio.replace(/-/g, "/"));
            const endDt = new Date(r.fecha_fin.replace(/-/g, "/"));
            const diffMs = endDt - startDt;
            const hours = Math.round(diffMs / (1000 * 60 * 60));
            if (hoursInput) hoursInput.value = hours || 1;
            
        } else if (r.tipo_estadia === 'dia') {
            const dayInput = document.querySelector('.res-day-only');
            if (dayInput) dayInput.value = r.fecha_inicio.split(' ')[0];
        } else {
            const startInput = document.querySelector('.res-start');
            const endInput = document.querySelector('.res-end');
            
            // Si es semana/quincena/mes, los inputs específicos
            const periodInputs = {
                'semana': '.res-week-start',
                'quincena': '.res-fortnight-start',
                'mes': '.res-month-start'
            };
            
            const specificInput = document.querySelector(periodInputs[r.tipo_estadia]);
            if (specificInput) {
                specificInput.value = r.fecha_inicio.split(' ')[0];
                // Disparar cambio para que calcule el fin automáticamente
                specificInput.dispatchEvent(new Event('change'));
            } else {
                if (startInput) startInput.value = r.fecha_inicio;
                if (endInput) endInput.value = r.fecha_fin;
            }
        }
        updateReservationPrice();
    }, 500);
}

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

function updateReservationPrice() {
    const typeSelect = document.querySelector('.res-type');
    if (!typeSelect) return;
    const type = typeSelect.value;
    const totalEl = document.getElementById('reserva-total-est');
    let total = 0;

    if (type === 'hora') {
        const hoursInput = document.querySelector('.res-hours-qty');
        const qty = hoursInput ? parseInt(hoursInput.value) || 0 : 0;
        total = qty * currentRates.hora;
    } else if (type === 'dia') {
        total = currentRates.dia;
    } else if (type === 'semana') {
        total = currentRates.semana;
    } else if (type === 'quincena') {
        total = currentRates.quincena;
    } else if (type === 'mes') {
        total = currentRates.mes;
    }

    if (totalEl) totalEl.innerText = total > 0 ? `$ ${total.toLocaleString()}` : '$ ---';
}

function initReservationForm() {
    const typeSelect = document.querySelector('.res-type');
    const dateOnlyInput = document.querySelector('.res-date-only');
    const dayOnlyInput = document.querySelector('.res-day-only');
    const weekStartInput = document.querySelector('.res-week-start');
    const fortnightStartInput = document.querySelector('.res-fortnight-start');
    const monthStartInput = document.querySelector('.res-month-start');
    const hoursInput = document.querySelector('.res-hours-qty');
    
    if (!typeSelect) return;

    [typeSelect, hoursInput].forEach(el => {
        if(el) el.addEventListener('change', updateReservationPrice);
        if(el) el.addEventListener('input', updateReservationPrice);
    });

    if (dateOnlyInput) {
        flatpickr(dateOnlyInput, { dateFormat: "Y-m-d", minDate: "today", theme: "dark", onChange: updateReservationPrice });
    }

    if (dayOnlyInput) {
        flatpickr(dayOnlyInput, { dateFormat: "Y-m-d", minDate: "today", theme: "dark", onChange: updateReservationPrice });
    }

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
    if (fortnightStartInput) setAutoEnd(fortnightStartInput, '.res-fortnight-end', 15);
    if (monthStartInput) setAutoEnd(monthStartInput, '.res-month-end', 30);

    const startInput = document.querySelector('.res-start');
    const endInput = document.querySelector('.res-end');
    if (startInput) {
        flatpickr(startInput, {
            enableTime: true, dateFormat: "Y-m-d H:i", minDate: "today", theme: "dark",
            onChange: updateReservationPrice
        });
    }
    if (endInput) {
        flatpickr(endInput, {
            enableTime: true, dateFormat: "Y-m-d H:i", minDate: "today", theme: "dark",
            onChange: updateReservationPrice
        });
    }

    typeSelect.addEventListener('change', (e) => {
        updateFormGroups(e.target.value);
    });

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

async function createReservation(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalContent = btn.innerHTML;
    
    const patente = e.target.querySelector('.res-vehicle').value;
    const sucursal = e.target.querySelector('.res-sede').value;
    const tipo = e.target.querySelector('.res-type').value;
    
    if (!patente) return showToast('Seleccioná un vehículo');

    let inicio, fin;

    if (tipo === 'hora') {
        const fecha = e.target.querySelector('.res-date-only').value;
        const hora = e.target.querySelector('.res-time-only').value;
        const hoursQtyEl = e.target.querySelector('.res-hours-qty');
        const hoursQty = hoursQtyEl ? parseInt(hoursQtyEl.value) : 1;
        if (!fecha || !hora) return showToast('Por favor seleccioná fecha y hora');
        inicio = `${fecha} ${hora}`;
        const startDt = new Date(inicio.replace(/-/g, "/"));
        const endDt = new Date(startDt.getTime() + hoursQty * 60 * 60 * 1000);
        const y = endDt.getFullYear();
        const m = (endDt.getMonth() + 1).toString().padStart(2, '0');
        const d = endDt.getDate().toString().padStart(2, '0');
        const hh = endDt.getHours().toString().padStart(2, '0');
        const mm = endDt.getMinutes().toString().padStart(2, '0');
        fin = `${y}-${m}-${d} ${hh}:${mm}`;
    } else if (tipo === 'dia') {
        const fecha = e.target.querySelector('.res-day-only').value;
        if (!fecha) return showToast('Por favor seleccioná un día');
        inicio = `${fecha} 00:00`;
        fin = `${fecha} 23:59`;
    } else {
        const periodData = {
            'semana': { input: '.res-week-start', days: 7 },
            'quincena': { input: '.res-fortnight-start', days: 15 },
            'mes': { input: '.res-month-start', days: 30 }
        };

        if (periodData[tipo]) {
            const fechaInput = e.target.querySelector(periodData[tipo].input);
            const fecha = fechaInput ? fechaInput.value : '';
            if (!fecha) return showToast('Por favor seleccioná un día de inicio');
            inicio = `${fecha} 00:00`;
            const startDt = new Date(fecha.replace(/-/g, "/"));
            const endDt = new Date(startDt.getTime() + periodData[tipo].days * 24 * 60 * 60 * 1000);
            const y = endDt.getFullYear();
            const m = (endDt.getMonth() + 1).toString().padStart(2, '0');
            const d = endDt.getDate().toString().padStart(2, '0');
            fin = `${y}-${m}-${d} 23:59`;
        } else {
            inicio = e.target.querySelector('.res-start').value;
            fin = e.target.querySelector('.res-end').value;
        }
    }

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> PROCESANDO...';
    btn.disabled = true;

    // PREPARAR RESUMEN PARA CONFIRMACIÓN
    const resumenHtml = `
        <div style="text-align: left; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 15px; border: 1px solid rgba(197,160,89,0.2); margin-top: 10px;">
            <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-car" style="color: var(--dorado);"></i>
                <span>Vehículo: <b style="color: #fff;">${patente}</b></span>
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-location-dot" style="color: var(--dorado);"></i>
                <span>Sucursal: <b style="color: #fff;">${sucursal}</b></span>
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-calendar-day" style="color: var(--dorado);"></i>
                <span>Estadía: <b style="color: #fff; text-transform: capitalize;">${tipo}</b></span>
            </div>
            <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-clock" style="color: var(--dorado);"></i>
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 0.8rem; color: #666;">Desde: <b style="color: #eee;">${formatDate(inicio)}</b></span>
                    <span style="font-size: 0.8rem; color: #666;">Hasta: <b style="color: #eee;">${formatDate(fin)}</b></span>
                </div>
            </div>
            <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.05); display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 800; font-size: 0.8rem;">TOTAL A PAGAR:</span>
                <b style="color: var(--dorado); font-size: 1.2rem; font-family: Montserrat;">${document.getElementById('reserva-total-est').innerText}</b>
            </div>
        </div>
    `;

    const confirmed = await showConfirm('REVISÁ TU RESERVA', resumenHtml);
    
    if (!confirmed) {
        btn.innerHTML = originalContent;
        btn.disabled = false;
        return;
    }

    try {
        const url = editingReservaId ? `${API_BASE}/user/reservations/${editingReservaId}` : `${API_BASE}/user/reservations`;
        const method = editingReservaId ? 'PATCH' : 'POST';
        
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({
                patente,
                fecha_inicio: inicio,
                fecha_fin: fin,
                sucursal_nombre: sucursal,
                tipo_estadia: tipo
            })
        });

        if (res.ok) {
            showToast(editingReservaId ? '¡Reserva actualizada!' : '¡Reserva creada con éxito!');
            resetReservaForm();
            toggleReservaForm();
            loadReservations();
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

async function loadReservations() {
    const res = await fetch(`${API_BASE}/user/reservations`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) return;
    
    const all = await res.json();
    const active = all.filter(r => r.estado_reserva === 'Pendiente' || r.estado_reserva === 'Activa');
    historyData = all.filter(r => r.estado_reserva !== 'Pendiente' && r.estado_reserva !== 'Activa');
    
    const statRes = document.getElementById('stat-reservations');
    if (statRes) statRes.innerText = active.length;

    // Actualizar Stats del Header
    const now = new Date();
    const inProgress = active.filter(r => now >= new Date(r.fecha_inicio.replace(/-/g, "/")) && now < new Date(r.fecha_fin.replace(/-/g, "/")));
    const upcoming = active.filter(r => now < new Date(r.fecha_inicio.replace(/-/g, "/")));

    const statActiveVal = document.getElementById('stat-res-active');
    const statUpcomingVal = document.getElementById('stat-res-upcoming');
    
    if (statActiveVal) statActiveVal.innerText = inProgress.length;
    if (statUpcomingVal) statUpcomingVal.innerText = upcoming.length;

    const featuredContainer = document.getElementById('container-res-featured');
    const featuredList = document.getElementById('reservation-featured-list');
    const activeList = document.getElementById('reservation-list-active');

    // Manejar Estadía Destacada (la primera que esté en curso)
    if (inProgress.length > 0) {
        if (featuredContainer) featuredContainer.style.display = 'block';
        if (featuredList) {
            featuredList.innerHTML = renderReservaCard(inProgress[0], true);
        }
    } else {
        if (featuredContainer) featuredContainer.style.display = 'none';
    }

    // Manejar Lista (Próximas + Resto de En curso si hubiera más de una)
    const listToRender = active.filter(r => inProgress.length > 0 ? r.id !== inProgress[0].id : true);

    if (activeList) {
        if (listToRender.length === 0 && inProgress.length === 0) {
            activeList.style.display = 'block'; // Para que el empty state ocupe todo el ancho
            activeList.innerHTML = `
                <div class="empty-state-minimal" style="padding: 40px; grid-column: span 2;">
                    <i class="fas fa-calendar-xmark" style="font-size: 3rem; color: #222; margin-bottom: 15px;"></i>
                    <p class="text-muted">No tenés reservas activas en este momento.</p>
                </div>`;
        } else if (listToRender.length === 0) {
             activeList.style.display = 'block';
             activeList.innerHTML = `<p class="text-muted" style="padding: 20px; opacity: 0.5;">No hay más reservas próximas.</p>`;
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
        const fromDate = new Date(fromVal);
        fromDate.setHours(0,0,0,0);
        filtered = filtered.filter(r => new Date(r.fecha_inicio.replace(/-/g, "/")) >= fromDate);
    }
    
    if (toVal) {
        const toDate = new Date(toVal);
        toDate.setHours(23,59,59,999);
        filtered = filtered.filter(r => new Date(r.fecha_inicio.replace(/-/g, "/")) <= toDate);
    }
    
    renderHistory(filtered);
}

function resetHistoryFilters() {
    const fromInput = document.getElementById('history-filter-from');
    const toInput = document.getElementById('history-filter-to');
    if (fromInput) fromInput.value = '';
    if (toInput) toInput.value = '';
    historialCurrentPage = 1;
    applyHistoryFilters();
}

function renderReservaCard(r, isFeatured) {
    const now = new Date();
    const start = new Date(r.fecha_inicio.replace(/-/g, "/"));
    const end = new Date(r.fecha_fin.replace(/-/g, "/"));
    
    let progress = 0;
    let progressText = "";
    let isStarted = now >= start;
    let isAboutToStart = !isStarted && (start - now) < 3600000; // 1 hora antes

    if (isStarted) {
        const total = end - start;
        const elapsed = now - start;
        progress = Math.min(100, Math.max(0, (elapsed / total) * 100));
        progressText = progress >= 100 ? "ESTADÍA FINALIZADA" : `PROGRESO DE ESTADÍA: ${Math.round(progress)}%`;
    } else {
        progressText = "";
    }

    const statusClass = r.estado_pago.toLowerCase();
    const canEdit = !isStarted && (start - now) > 7200000;

    return `
    <div class="reserva-card-ultra ${isFeatured ? 'featured' : ''}">
        <div class="reserva-header-ultra">
            <div class="reserva-info-main">
                <span class="reserva-tag-id">RESERVA #${r.id}</span>
                <div class="reserva-plate-container">
                    <div class="plate-badge-premium">${r.patente}</div>
                    ${isAboutToStart ? '<span class="status-badge-ultra active-pulse" style="background:rgba(197,160,89,0.1); color:#C5A059; border:1px solid #C5A059;">PRÓXIMA</span>' : ''}
                    ${isStarted && progress < 100 ? '<span class="status-badge-ultra active-pulse" style="background:rgba(16,185,129,0.1); color:#10b981; border:1px solid #10b981;">EN CURSO</span>' : ''}
                </div>
            </div>
            <div class="reserva-status-ultra">
                <div class="status-badge-ultra ${statusClass}">
                    <i class="fas ${r.estado_pago === 'Pagado' ? 'fa-check-circle' : 'fa-clock-rotate-left'}"></i>
                    ${r.estado_pago}
                </div>
                <div class="price-container-ultra">
                    <span class="price-value-ultra">$${r.monto_total.toLocaleString()}</span>
                </div>
            </div>
        </div>

        <div class="reserva-timeline-container">
            <div class="timeline-labels">
                <span>${isStarted ? 'INGRESO' : 'INICIO'}</span>
                <span>${progressText}</span>
                <span>${isStarted ? 'SALIDA' : 'FIN'}</span>
            </div>
            <div class="timeline-progress-bg">
                <div class="timeline-progress-fill ${isStarted ? 'active' : ''}" style="width: ${isStarted ? progress : 0}%"></div>
            </div>
        </div>

        <div class="reserva-details-ultra" ${isFeatured ? 'style="grid-template-columns: repeat(4, 1fr);"' : ''}>
            <div class="detail-item-ultra">
                <i class="fas fa-location-dot"></i>
                <div class="detail-info-ultra">
                    <span class="detail-label-ultra">Sucursal</span>
                    <span class="detail-value-ultra">${r.sucursal_nombre}</span>
                </div>
            </div>
            <div class="detail-item-ultra">
                <i class="fas fa-calendar-day"></i>
                <div class="detail-info-ultra">
                    <span class="detail-label-ultra">Estadía</span>
                    <span class="detail-value-ultra">${toTitle(r.tipo_estadia)}</span>
                </div>
            </div>
            <div class="detail-item-ultra">
                <i class="fas fa-clock"></i>
                <div class="detail-info-ultra">
                    <span class="detail-label-ultra">Desde</span>
                    <span class="detail-value-ultra">${formatDate(r.fecha_inicio)}</span>
                </div>
            </div>
            <div class="detail-item-ultra">
                <i class="fas fa-hourglass-end"></i>
                <div class="detail-info-ultra">
                    <span class="detail-label-ultra">Hasta</span>
                    <span class="detail-value-ultra">${formatDate(r.fecha_fin)}</span>
                </div>
            </div>
        </div>

        <div class="reserva-actions-ultra">
            ${r.estado_pago === 'Pagado' ? `
                <button class="btn-ultra btn-ultra-primary" onclick="showDigitalPass(${r.id})">
                    <i class="fas fa-ticket"></i> MI PASE DIGITAL
                </button>
            ` : `
                <button class="btn-ultra btn-ultra-primary" onclick="payReservation(${r.id})">
                    <i class="fas fa-credit-card"></i> PAGAR AHORA
                </button>
            `}
            
            <button class="btn-ultra btn-ultra-secondary" onclick="prepareEditReservation(${r.id})" ${!canEdit ? 'disabled title="No se puede editar con poca antelación"' : ''}>
                <i class="fas fa-pen"></i>
            </button>
            
            <button class="btn-ultra btn-ultra-danger" onclick="cancelReservation(${r.id})" ${isStarted ? 'disabled title="No se puede cancelar una estadía en curso"' : ''}>
                <i class="fas fa-trash"></i>
            </button>
        </div>
    </div>
    `;
}

// --- ACTUALIZACIÓN AUTOMÁTICA ---
// Refrescar cada 60 segundos para actualizar estados "En Curso" y barras de progreso
setInterval(() => {
    // Solo refrescar si estamos en la sección de reservas o si el modal de pase no está abierto
    const reservationsSec = document.getElementById('section-reservas');
    const isVisible = reservationsSec && reservationsSec.classList.contains('active') || (window.getComputedStyle && reservationsSec && window.getComputedStyle(reservationsSec).display !== 'none');
    
    if (isVisible && token) {
        loadReservations();
    }
}, 60000);

// --- PASE DIGITAL CON QR ---

async function showDigitalPass(id) {
    const res = await fetch(`${API_BASE}/user/reservations`, { headers: { 'Authorization': `Bearer ${token}` } });
    const all = await res.json();
    const r = all.find(item => item.id === id);
    if (!r) return;

    // Llenar datos del ticket
    document.getElementById('ticket-id-display').innerText = `#${r.id.toString().padStart(6, '0')}`;
    document.getElementById('ticket-patente').innerText = r.patente;
    document.getElementById('ticket-vence').innerText = formatDate(r.fecha_fin).split(',')[0];
    document.getElementById('ticket-sucursal').innerText = r.sucursal_nombre;
    document.getElementById('ticket-direccion').innerText = r.sucursal_info || 'Dirección no disponible';

    // Generar QR
    const qrContainer = document.getElementById('ticket-qr');
    qrContainer.innerHTML = '';
    new QRCode(qrContainer, {
        text: `AUTOPASS|ID:${r.id}|PLATE:${r.patente}|BRANCH:${r.sucursal_nombre}`,
        width: 180,
        height: 180,
        colorDark: "#000000",
        colorLight: "#ffffff",
        correctLevel: QRCode.CorrectLevel.H
    });

    // Mostrar modal
    document.getElementById('modal-pase-digital').style.display = 'flex';
}

function closeDigitalPass() {
    document.getElementById('modal-pase-digital').style.display = 'none';
}

async function shareTicket() {
    const ticket = document.getElementById('ticket-to-capture');
    const noPrintElements = ticket.querySelectorAll('.no-print');
    
    // Ocultar elementos no deseados para la captura
    noPrintElements.forEach(el => el.style.opacity = '0');
    
    try {
        const canvas = await html2canvas(ticket, {
            backgroundColor: '#0a0a0a',
            scale: 3, // Máxima calidad para compartir
            logging: false,
            useCORS: true,
            borderRadius: 28
        });

        canvas.toBlob(async (blob) => {
            const file = new File([blob], `AutoPass_Ticket_${Date.now()}.png`, { type: 'image/png' });
            
            // Verificar si el navegador soporta compartir archivos
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({
                        files: [file],
                        title: 'Mi Pase AutoPass',
                        text: 'Te comparto mi pase digital de AutoPass.'
                    });
                } catch (err) {
                    if (err.name !== 'AbortError') showToast('Error al compartir');
                }
            } else {
                // Fallback: Descarga si no soporta compartir
                const link = document.createElement('a');
                link.download = `AutoPass_Ticket_${Date.now()}.png`;
                link.href = URL.createObjectURL(blob);
                link.click();
                showToast('Tu navegador no soporta compartir, se descargó la imagen.');
            }
        }, 'image/png', 1.0);

    } catch (err) {
        showToast('Error al generar la imagen');
    } finally {
        // Restaurar elementos
        noPrintElements.forEach(el => el.style.opacity = '1');
    }
}

function renderHistory(history) {
    const list = document.getElementById('reservation-list-history');
    if (!list) return;

    const totalPages = Math.ceil(history.length / HISTORIAL_PAGE_SIZE);
    
    if (history.length === 0) {
        list.innerHTML = '<p class="text-muted" style="padding: 30px;">No hay historial de reservas.</p>';
        return;
    }

    const start = (historialCurrentPage - 1) * HISTORIAL_PAGE_SIZE;
    const paged = history.slice(start, start + HISTORIAL_PAGE_SIZE);

    list.innerHTML = paged.map(r => {
        const statusClass = r.estado_reserva.toLowerCase();
        const icon = statusClass === 'completada' ? 'fa-car-circle-check' : (statusClass === 'cancelada' ? 'fa-ban' : 'fa-clock-rotate-left');
        
        return `
        <div class="historial-item">
            <div class="hist-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="hist-main-info">
                <span class="hist-title">${r.sucursal_nombre}</span>
                <span class="hist-subtitle">${r.patente} • ${formatDate(r.fecha_inicio).split(',')[0]}</span>
            </div>
            <div class="hist-amount-info">
                <span class="hist-value">$${r.monto_total.toLocaleString()}</span>
                <div class="status-pill ${statusClass}">
                    <i class="fas ${statusClass === 'completada' ? 'fa-check' : 'fa-xmark'}"></i>
                    ${r.estado_reserva}
                </div>
            </div>
            <div class="hist-actions-group">
                <button class="btn-claim-express" onclick="openClaim(${r.id})" title="Iniciar Reclamo">
                    <i class="fas fa-circle-exclamation"></i>
                </button>
                <button class="btn-repeat-express" onclick="repeatReservation('${r.patente}', '${r.sucursal_nombre}', '${r.tipo_estadia}')" title="Repetir Reserva">
                    <i class="fas fa-rotate-right"></i>
                </button>
            </div>
        </div>
    `;
    }).join('');

    const pageInfo = document.getElementById('historial-page-info');
    if (pageInfo) pageInfo.innerText = `Página ${historialCurrentPage} de ${totalPages || 1}`;
    
    const prevBtn = document.getElementById('historial-prev');
    const nextBtn = document.getElementById('historial-next');
    if (prevBtn) prevBtn.disabled = historialCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = historialCurrentPage >= totalPages;
}

async function repeatReservation(patente, sucursal, tipo) {
    // Cambiar a sección inicio
    const inicioNavItem = document.querySelector('.nav-item[onclick*="inicio"]');
    if (inicioNavItem && typeof showSection === 'function') {
        showSection('inicio', inicioNavItem);
    }

    // Abrir formulario
    const container = document.getElementById('reserva-form-container');
    if (!container.classList.contains('open')) {
        await toggleReservaForm();
    }

    // Scroll sutil
    container.scrollIntoView({ behavior: 'smooth' });

    // Pre-cargar valores
    setTimeout(() => {
        const vehicleSelect = document.querySelector('.res-vehicle');
        const sedeSelect = document.querySelector('.res-sede');
        const typeSelect = document.querySelector('.res-type');
        
        if (vehicleSelect) vehicleSelect.value = patente;
        if (sedeSelect) sedeSelect.value = sucursal;
        if (typeSelect) {
            typeSelect.value = tipo;
            updateFormGroups(tipo);
        }
        
        showToast('¡Datos cargados! Elegí la nueva fecha.');
    }, 500);
}

function openClaim(id) {
    showToast(`Iniciando reclamo para Reserva #${id}... (Módulo en desarrollo)`);
    // Aquí se podría abrir un modal con un formulario de contacto o ticket
}

function historialPage(dir) {
    historialCurrentPage += dir;
    applyHistoryFilters(); // Re-renderizar con filtros actuales sin recargar de API
}

async function cancelReservation(id) {
    const confirmed = await showConfirm(
        'CANCELAR RESERVA',
        '¿Estás seguro de cancelar esta reserva? Esta acción no se puede deshacer.'
    );
    if (!confirmed) return;
    
    try {
        const res = await fetch(`${API_BASE}/user/reservations/${id}/cancel`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Reserva cancelada');
            loadReservations();
            if (typeof loadProfile === 'function') loadProfile(); // Refrescar saldo
        } else {
            const d = await res.json();
            showToast(d.detail || 'Error al cancelar');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

async function payReservation(id) {
    const confirmed = await showConfirm(
        'PAGAR RESERVA',
        '¿Deseás pagar esta reserva usando tu saldo de AutoPass?'
    );
    if (!confirmed) return;
    
    try {
        const res = await fetch(`${API_BASE}/user/reservations/${id}/pay`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            showToast('¡Pago realizado con éxito!');
            loadReservations();
            if (typeof loadProfile === 'function') loadProfile(); // Actualizar saldo en UI
        } else {
            const data = await res.json();
            showToast(data.detail || 'Error al procesar el pago');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

function toggleHistorial() {
    const container = document.getElementById('historial-container');
    const arrow = document.getElementById('historial-arrow');
    if (!container) return;
    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}
