// --- LÓGICA DE RESERVAS ---

let historialCurrentPage = 1;
const HISTORIAL_PAGE_SIZE = 5;
let currentRates = { hora: 1500, dia: 15000, semana: 70000, quincena: 120000, mes: 200000 };
let editingReservaId = null;

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
    const history = all.filter(r => r.estado_reserva !== 'Pendiente' && r.estado_reserva !== 'Activa');
    
    const statRes = document.getElementById('stat-reservations');
    if (statRes) statRes.innerText = active.length;

    const activeList = document.getElementById('reservation-list-active');
    if (activeList) {
        if (active.length === 0) {
            activeList.innerHTML = `
                <div class="empty-state-minimal" style="padding: 20px;">
                    <i class="fas fa-calendar-xmark" style="font-size: 2rem; color: #222; margin-bottom: 10px;"></i>
                    <p class="text-muted">No tenés reservas activas en este momento.</p>
                </div>`;
        } else {
            activeList.innerHTML = active.map(r => `
                <div class="reserva-card-modern">
                    <div class="reserva-header">
                        <div class="reserva-main-info">
                            <span class="reserva-id">#${r.id}</span>
                            <div class="plate-badge-sm">${r.patente}</div>
                        </div>
                        <div class="reserva-status-badge ${r.estado_pago.toLowerCase()}">${r.estado_pago}</div>
                    </div>
                    <div class="reserva-body">
                        <div class="info-row"><i class="fas fa-location-dot"></i> <span>${r.sucursal_nombre}</span></div>
                        <div class="info-row" style="font-size: 0.75rem; opacity: 0.7; margin-top: -5px; padding-left: 28px;">
                            <span>${r.sucursal_info || ''}</span>
                        </div>
                        <div class="info-row"><i class="fas fa-clock"></i> <span>${formatDate(r.fecha_inicio)} - ${formatDate(r.fecha_fin)}</span></div>
                        <div class="info-row"><i class="fas fa-receipt"></i> <span>$${r.monto_total.toLocaleString()} (${toTitle(r.tipo_estadia)})</span></div>
                    </div>
                    <div class="reserva-actions">
                        ${r.estado_pago === 'Pagado' ? `
                            <button class="btn btn-primary" onclick="showDigitalPass(${r.id})">
                                <i class="fas fa-qrcode"></i> VER PASE DIGITAL
                            </button>
                        ` : `
                            <button class="btn btn-primary" onclick="payReservation(${r.id})">
                                <i class="fas fa-wallet"></i> PAGAR RESERVA
                            </button>
                        `}
                        <button class="btn btn-outline" onclick="prepareEditReservation(${r.id})">
                            <i class="fas fa-pen-to-square"></i> EDITAR
                        </button>
                        <button class="btn btn-outline btn-danger" onclick="cancelReservation(${r.id})">
                            <i class="fas fa-trash-can"></i> CANCELAR
                        </button>
                    </div>
                </div>
            `).join('');
        }
    }

    renderHistory(history);
}

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
        list.innerHTML = '<p class="text-muted">No hay historial de reservas.</p>';
        return;
    }

    const start = (historialCurrentPage - 1) * HISTORIAL_PAGE_SIZE;
    const paged = history.slice(start, start + HISTORIAL_PAGE_SIZE);

    list.innerHTML = paged.map(r => `
        <div class="historial-item">
            <div class="flex-row justify-between align-center">
                <div>
                    <div class="text-bold">${r.patente}</div>
                    <div class="text-label" style="font-size: 0.7rem;">${formatDate(r.fecha_inicio)}</div>
                </div>
                <div class="flex-col align-end">
                    <div class="text-bold">$${r.monto_total}</div>
                    <div class="status-pill ${r.estado_reserva.toLowerCase()}">${r.estado_reserva}</div>
                </div>
            </div>
        </div>
    `).join('');

    const pageInfo = document.getElementById('historial-page-info');
    if (pageInfo) pageInfo.innerText = `Página ${historialCurrentPage} de ${totalPages || 1}`;
    
    const prevBtn = document.getElementById('historial-prev');
    const nextBtn = document.getElementById('historial-next');
    if (prevBtn) prevBtn.disabled = historialCurrentPage === 1;
    if (nextBtn) nextBtn.disabled = historialCurrentPage >= totalPages;
}

function historialPage(dir) {
    historialCurrentPage += dir;
    loadReservations();
}

async function cancelReservation(id) {
    if (!confirm('¿Estás seguro de cancelar esta reserva?')) return;
    
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
    if (!confirm('¿Deseás pagar esta reserva usando tu saldo?')) return;
    
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
