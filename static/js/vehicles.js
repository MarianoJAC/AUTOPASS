/* --- LÓGICA DE GESTIÓN DE VEHÍCULOS --- */

/**
 * Carga la flota de vehículos del usuario desde el servidor.
 */
async function loadVehicles() {
    const list = document.getElementById('vehicle-list');
    const statVehicles = document.getElementById('stat-vehicles');
    
    if (!list) return;

    const res = await apiClient.get('/user/vehicles');
    if (!res.ok) {
        console.error('Error al cargar vehículos:', res.error);
        list.innerHTML = '<p style="color: var(--danger);">Error al cargar flota.</p>';
        return;
    }
    
    const vehicles = res.data;
    if (statVehicles) statVehicles.innerText = vehicles.length;
    
    if (vehicles.length === 0) {
        list.innerHTML = `
            <div class="empty-state-card" style="display: block; grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-car-side" style="font-size: 3rem; color: #333; margin-bottom: 15px; display: block;"></i>
                <p style="color: #666; font-weight: 600;">No tenés vehículos registrados aún.</p>
            </div>`;
        return;
    }

    list.innerHTML = vehicles.map(v => `
        <div class="vehicle-card">
            <i class="fas fa-car-rear bg-icon-modern"></i>
            <div class="vehicle-card-main">
                <div class="vehicle-data-group">
                    <div class="plate-badge-modern">${v.patente}</div>
                    <div class="vehicle-brand">${v.marca_modelo}</div>
                </div>
                <button class="delete-btn-modern" title="Eliminar vehículo" onclick="deleteVehicle('${v.patente}')">
                    <i class="fas fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');

    // Actualizar selectores en formularios de reserva
    const selects = document.querySelectorAll('.res-vehicle');
    selects.forEach(select => {
        const currentVal = select.value;
        select.innerHTML = '<option value="">Seleccioná tu vehículo...</option>' + 
            vehicles.map(v => `<option value="${v.patente}">${v.patente} - ${v.marca_modelo}</option>`).join('');
        if (currentVal) select.value = currentVal;
    });
}

/**
 * Registra un nuevo vehículo en el sistema.
 */
async function addVehicle(e, isQuickAdd = false) {
    e.preventDefault();
    const form = e.target;
    const btn = form.querySelector('button[type="submit"]');
    const originalContent = btn.innerHTML;
    
    const patente = form.querySelector('[name="patente"]').value.trim().toUpperCase();
    const marca_modelo = form.querySelector('[name="marca_modelo"]').value.trim();

    if (!patente || !marca_modelo) {
        showToast('Completá todos los campos');
        return;
    }

    // Resumen para confirmación visual
    const resumenHtml = `
        <div style="text-align: left; background: rgba(255,255,255,0.03); padding: 20px; border-radius: 15px; border: 1px solid rgba(197,160,89,0.2); margin-top: 10px;">
            <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-id-card" style="color: var(--dorado);"></i>
                <span>Patente: <b style="color: #fff;">${patente}</b></span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-car-side" style="color: var(--dorado);"></i>
                <span>Marca/Modelo: <b style="color: #fff;">${marca_modelo}</b></span>
            </div>
        </div>
    `;

    const confirmed = await showConfirm('CONFIRMAR NUEVO VEHÍCULO', resumenHtml);
    if (!confirmed) return;

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    btn.disabled = true;

    const res = await apiClient.post(`/user/vehicles?patente=${encodeURIComponent(patente)}&marca_modelo=${encodeURIComponent(marca_modelo)}`);
    if (res.ok) {
        showToast('Vehículo registrado con éxito');
        form.reset();
        
        if (isQuickAdd) {
            const container = document.getElementById('reserva-form-container');
            if (container) container.classList.remove('open');
            await toggleReservaForm();
        } else {
            toggleNuevoVinculo();
        }
        
        await loadVehicles();
    } else {
        showToast(res.error || 'Error al registrar vehículo');
    }
    
    btn.innerHTML = originalContent;
    btn.disabled = false;
}

/**
 * Elimina un vehículo previa confirmación.
 */
async function deleteVehicle(patente) {
    const confirmed = await showConfirm(
        'ELIMINAR VEHÍCULO',
        `¿Estás seguro de que querés eliminar el vehículo con patente ${patente}? Esta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    const res = await apiClient.delete(`/user/vehicles/${encodeURIComponent(patente)}`);
    if (res.ok) {
        showToast('Vehículo eliminado');
        await loadVehicles();
        if (typeof refreshReservationFormState === 'function') refreshReservationFormState();
    } else {
        showToast(res.error || 'Error al eliminar');
    }
}

/**
 * Despliega/Oculta el formulario de nuevo vehículo.
 */
function toggleNuevoVinculo() {
    const container = document.getElementById('vinculo-container');
    const trigger = document.querySelector('.register-trigger-card');
    const arrow = document.getElementById('vinculo-arrow');
    
    if (!container) return;

    const isOpen = container.classList.toggle('open');
    if (trigger) trigger.classList.toggle('open');
    if (arrow) {
        const isMobile = window.innerWidth <= 900;
        if (isMobile) {
            arrow.style.transform = isOpen ? 'rotate(270deg)' : 'rotate(90deg)';
        } else {
            arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    }
}
