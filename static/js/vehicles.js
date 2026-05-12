// --- LÓGICA DE VEHÍCULOS ---

async function loadVehicles() {
    const list = document.getElementById('vehicle-list');
    const statVehicles = document.getElementById('stat-vehicles');
    
    if (!list) return;

    try {
        const res = await fetch(`${API_BASE}/user/vehicles`, { 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        if (!res.ok) throw new Error('Error al cargar vehículos');
        
        const vehicles = await res.json();
        
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

        // Actualizar selects en formularios de reserva
        const selects = document.querySelectorAll('.res-vehicle');
        selects.forEach(select => {
            select.innerHTML = '<option value="">Seleccioná tu vehículo...</option>' + 
                vehicles.map(v => `<option value="${v.patente}">${v.patente} - ${v.marca_modelo}</option>`).join('');
        });
    } catch (err) {
        console.error('Load vehicles failed:', err);
        list.innerHTML = '<p style="color: var(--danger);">Error al cargar flota.</p>';
    }
}

function showInlineAddVehicle() {
    const msg = document.getElementById('empty-state-msg');
    const form = document.getElementById('empty-state-form');
    if (msg && form) {
        msg.style.display = 'none';
        form.style.display = 'block';
    }
}

function hideInlineAddVehicle() {
    const msg = document.getElementById('empty-state-msg');
    const form = document.getElementById('empty-state-form');
    if (msg && form) {
        msg.style.display = 'flex';
        form.style.display = 'none';
    }
}

async function addVehicle(e) {
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

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
    btn.disabled = true;

    try {
        const res = await fetch(`${API_BASE}/user/vehicles?patente=${encodeURIComponent(patente)}&marca_modelo=${encodeURIComponent(marca_modelo)}`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await res.json();
        if (res.ok) {
            showToast('Vehículo registrado con éxito');
            form.reset();
            
            // Si estábamos en el modo inline, refrescar el formulario de reserva
            const inlineForm = document.getElementById('empty-state-form');
            if (inlineForm && inlineForm.style.display !== 'none') {
                hideInlineAddVehicle();
                // Llamar a toggleReservaForm para que revalide la flota y muestre el form de reserva
                if (typeof toggleReservaForm === 'function') {
                    // Forzamos el refresco cerrando y abriendo o simplemente llamando a la lógica
                    const container = document.getElementById('reserva-form-container');
                    container.classList.remove('open'); // Lo cerramos para que al abrirlo en la gestión de vehículos se actualice
                    await toggleReservaForm(); // Esto detectará el nuevo auto y mostrará el form de reserva
                }
            } else {
                toggleNuevoVinculo();
            }
            
            await loadVehicles();
        } else {
            showToast(data.detail || 'Error al registrar vehículo');
        }
    } catch (err) {
        showToast('Error de conexión con el servidor');
    } finally {
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

async function deleteVehicle(patente) {
    if (!confirm(`¿Estás seguro de eliminar el vehículo ${patente}?`)) return;

    try {
        const res = await fetch(`${API_BASE}/user/vehicles/${encodeURIComponent(patente)}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (res.ok) {
            showToast('Vehículo eliminado');
            await loadVehicles();
        } else {
            const data = await res.json();
            showToast(data.detail || 'Error al eliminar');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

function toggleNuevoVinculo() {
    const container = document.getElementById('vinculo-container');
    const trigger = document.querySelector('.register-trigger-card');
    const arrow = document.getElementById('vinculo-arrow');
    
    if (!container) return;

    const isOpen = container.classList.toggle('open');
    if (trigger) trigger.classList.toggle('open');
    if (arrow) {
        arrow.style.transform = isOpen ? 'rotate(90deg)' : 'rotate(0deg)';
    }
}
