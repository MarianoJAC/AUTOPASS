/* --- LÓGICA DEL PERFIL DE USUARIO Y DASHBOARD --- */

// Inicialización de componentes al cargar el portal
document.addEventListener('DOMContentLoaded', () => {
    // Reloj dinámico para el Dashboard (Admin)
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        setInterval(() => {
            clockEl.innerText = new Date().toLocaleTimeString();
        }, 1000);
    }

    // Carga inicial de datos si hay sesión activa
    if (document.getElementById('balance-val') && localStorage.getItem('token')) {
        loadProfile();
        if (typeof loadVehicles === 'function') loadVehicles();
        if (typeof loadReservations === 'function') loadReservations();
        if (typeof initReservationForm === 'function') initReservationForm();
    }
});

/**
 * Cambia la sección visible en el panel lateral (Sidebar).
 */
function showSection(sectionId, el) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.profile-section').forEach(s => s.classList.remove('active'));
    const sectionEl = document.getElementById(`section-${sectionId}`);
    if (sectionEl) sectionEl.classList.add('active');
    
    // Acciones específicas por sección
    if (sectionId === 'reservas' && typeof loadReservations === 'function') loadReservations();
    if (sectionId === 'puntos') loadPointsData();
    if (sectionId === 'inicio') {
        loadProfile();
        if (typeof loadReservations === 'function') loadReservations();
        if (typeof refreshReservationFormState === 'function') refreshReservationFormState();
    }
    if (sectionId === 'perfil') loadProfile();
}

// --- GESTIÓN DE PUNTOS AUTOPASS ---

async function loadPointsData() {
    await loadProfile(); 
    loadPromotions();
    loadPointsHistory();
}

/**
 * Carga el catálogo de beneficios disponibles.
 */
async function loadPromotions() {
    const grid = document.getElementById('promotions-grid');
    if (!grid) return;
    
    const res = await apiClient.get('/user/promotions');
    if (!res.ok) {
        console.error("Error cargando promociones:", res.error);
        grid.innerHTML = '<p class="text-danger" style="grid-column: 1/-1; padding: 20px;">Error al cargar promociones.</p>';
        return;
    }

    const promos = res.data;
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const currentPts = userData.puntos_acumulados || 0;

    if (promos.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-minimal" style="grid-column: 1/-1; padding: 50px;">
                <i class="fas fa-tags" style="font-size: 3rem; color: var(--primary); opacity: 0.3; margin-bottom: 20px;"></i>
                <p style="color: #888;">No hay promociones activas en este momento.</p>
            </div>`;
        return;
    }

    grid.innerHTML = promos.map(p => `
        <div class="promo-card">
            <div class="promo-header">
                <div class="promo-icon"><i class="${p.icono}"></i></div>
                <div class="promo-title">${p.titulo}</div>
            </div>
            <div class="promo-body">
                <p class="promo-desc">${p.descripcion}</p>
                <div class="promo-cost">${p.costo_puntos} <span>puntos</span></div>
            </div>
            <div class="promo-footer">
                <button class="btn-redeem" onclick="redeemPoints(${p.id}, ${p.costo_puntos})" 
                    ${currentPts < p.costo_puntos ? 'disabled title="Puntos insuficientes"' : ''}>
                    CANJEAR AHORA
                </button>
            </div>
        </div>
    `).join('');
}

/**
 * Carga el historial de movimientos de puntos.
 */
async function loadPointsHistory() {
    const list = document.getElementById('points-history-list');
    if (!list) return;

    const res = await apiClient.get('/user/points-history');
    if (!res.ok) {
        list.innerHTML = '<p class="text-danger">Error al cargar historial</p>';
        return;
    }

    const history = res.data;
    let totalEarned = 0;
    let totalRedeemed = 0;

    if (history.length === 0) {
        list.innerHTML = '<p style="padding:30px; text-align:center; color:#888;">No hay movimientos registrados.</p>';
    } else {
        list.innerHTML = history.map(h => {
            const isPos = h.cantidad > 0;
            if (isPos) totalEarned += h.cantidad;
            else totalRedeemed += Math.abs(h.cantidad);

            return `
                <div class="pts-item">
                    <div class="pts-item-info">
                        <span class="pts-item-reason">${h.motivo}</span>
                        <span class="pts-item-date">${formatDate(h.fecha)}</span>
                    </div>
                    <span class="pts-item-amount ${isPos ? 'pts-positive' : 'pts-negative'}">
                        ${isPos ? '+' : ''}${h.cantidad}
                    </span>
                </div>
            `;
        }).join('');
    }

    const earnedEl = document.getElementById('total-earned-pts'); if (earnedEl) earnedEl.innerText = totalEarned;
    const redeemedEl = document.getElementById('total-redeemed-pts'); if (redeemedEl) redeemedEl.innerText = totalRedeemed;
}

/**
 * Procesa el canje de puntos por un beneficio.
 */
async function redeemPoints(promoId, cost) {
    const confirmCanje = await showConfirm('Confirmar Canje', `¿Estás seguro de que querés canjear ${cost} puntos por este beneficio?`);
    if (!confirmCanje) return;

    const res = await apiClient.post(`/user/redeem/${promoId}`);
    if (res.ok) {
        showToast(res.data.message);
        await loadPointsData();
    } else {
        showToast(res.error || 'Error al canjear');
    }
}

function togglePointsHistory() {
    const container = document.getElementById('pts-history-container');
    const arrow = document.getElementById('pts-history-arrow');
    if (!container) return;
    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

// --- GESTIÓN DEL PERFIL DE USUARIO ---

/**
 * Obtiene y renderiza los datos personales del usuario.
 */
async function loadProfile() {
    const res = await apiClient.get('/user/me');
    if (!res.ok) return;

    const user = res.data;
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('nombre', toTitle(user.nombre));
    localStorage.setItem('apellido', toTitle(user.apellido));
    
    // Actualización de UI Global
    const welcomeEl = document.getElementById('welcome-greeting');
    if (welcomeEl) welcomeEl.innerText = `¡HOLA, ${user.nombre.toUpperCase()}!`;
    
    const pts = document.getElementById('points-val'); if (pts) pts.innerText = user.puntos_acumulados || 0;
    const pagePts = document.getElementById('points-page-val'); if (pagePts) pagePts.innerText = user.puntos_acumulados || 0;
    const balance = document.getElementById('balance-val'); if (balance) balance.innerText = `$${(user.saldo || 0).toFixed(2)}`;
    
    const initials = (user.nombre[0] || '') + (user.apellido[0] || '');
    const initialsEl = document.getElementById('user-initials'); if (initialsEl) initialsEl.innerText = initials.toUpperCase();
    const fullNameEl = document.getElementById('profile-full-name'); if (fullNameEl) fullNameEl.innerText = `${toTitle(user.nombre)} ${toTitle(user.apellido)}`;
    
    const memberSinceEl = document.getElementById('user-member-since');
    if (memberSinceEl) {
        const date = user.created_at ? new Date(user.created_at) : new Date();
        memberSinceEl.innerText = `Miembro desde: ${date.toLocaleDateString()}`;
    }

    updatePointsProgress(user.puntos_acumulados || 0);

    // Carga de historial para estadísticas
    const resStays = await apiClient.get('/user/payment-history');
    if (resStays.ok) {
        const staysEl = document.getElementById('acc-stat-stays'); if (staysEl) staysEl.innerText = resStays.data.length;
    }

    // Llenado de campos del formulario
    const dispNombre = document.getElementById('display-nombre'); if (dispNombre) dispNombre.innerText = toTitle(user.nombre);
    const dispApellido = document.getElementById('display-apellido'); if (dispApellido) dispApellido.innerText = toTitle(user.apellido);
    const dispEmail = document.getElementById('display-email'); if (dispEmail) dispEmail.innerText = user.email;
    const dispTel = document.getElementById('display-telefono'); 
    if (dispTel) dispTel.innerText = (user.telefono || '').replace(/(\d{2})(\d{4})(\d+)/, "$1 $2 $3");
    const dispDni = document.getElementById('display-dni');
    if (dispDni && user.dni) dispDni.innerText = user.dni.toString().replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
}

/**
 * Actualiza visualmente la barra de progreso de fidelización.
 */
function updatePointsProgress(currentPts) {
    const progressBar = document.getElementById('points-progress-bar');
    const targetEl = document.getElementById('points-next-reward');
    const footerText = document.getElementById('points-progress-text');
    
    if (!progressBar) return;

    const targets = [500, 1000, 2500, 5000, 10000];
    const nextTarget = targets.find(t => t > currentPts) || targets[targets.length - 1];
    const prevTarget = targets[targets.indexOf(nextTarget) - 1] || 0;
    
    const progress = ((currentPts - prevTarget) / (nextTarget - prevTarget)) * 100;
    progressBar.style.width = `${Math.min(100, progress)}%`;
    
    if (targetEl) targetEl.innerText = `Prox: ${nextTarget} pts`;
    if (footerText) {
        const remaining = nextTarget - currentPts;
        footerText.innerText = remaining > 0 ? 
            `¡Te faltan solo ${remaining} puntos para tu próximo beneficio AutoPass!` : 
            `¡Llegaste al nivel máximo! Canjeá tus puntos por estadías gratis.`;
    }
}

/**
 * Manejo de edición de campos individuales.
 */
function enterEditMode(field) {
    const item = document.getElementById(`item-${field}`);
    item.querySelector('.display-mode').style.display = 'none';
    item.querySelector('.edit-mode').style.display = 'flex';
    let value = document.getElementById(`display-${field}`).innerText.trim();
    if (field === 'dni') value = value.replace(/\./g, '');
    document.getElementById(`input-${field}`).value = value;
}

function exitEditMode(field) {
    const item = document.getElementById(`item-${field}`);
    item.querySelector('.display-mode').style.display = 'flex';
    item.querySelector('.edit-mode').style.display = 'none';
}

async function saveField(field, event) {
    const btn = event.target;
    const originalText = btn.innerText;
    const newValue = document.getElementById(`input-${field}`).value;
    
    btn.innerText = 'Guardando...';
    btn.disabled = true;

    const res = await apiClient.put('/user/me', { [field]: newValue });
    if (res.ok) {
        showToast(`${toTitle(field)} actualizado correctamente`);
        exitEditMode(field);
        await loadProfile();
    } else {
        showToast(res.error || 'Error al guardar');
    }
    
    btn.innerText = originalText;
    btn.disabled = false;
}

/**
 * Procesa el cambio de contraseña.
 */
async function changePassword(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    const current = document.getElementById('current-password').value;
    const newPass = document.getElementById('new-password').value;
    const confirm = document.getElementById('confirm-new-password').value;
    
    if (newPass !== confirm) {
        showToast('Las contraseñas no coinciden');
        return;
    }

    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Actualizando...';
    btn.disabled = true;

    const res = await apiClient.post('/user/change-password', { current_password: current, new_password: newPass });
    if (res.ok) {
        showToast('Contraseña actualizada con éxito');
        e.target.reset();
        document.querySelectorAll('.req-item').forEach(el => {
            el.classList.remove('satisfied');
            el.querySelector('i').className = 'far fa-circle';
        });
        document.getElementById('password-strength').className = 'strength-meter';
    } else {
        showToast(res.error || 'Error al cambiar contraseña');
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}

function togglePersonalInfo() {
    const container = document.getElementById('personal-info-container');
    const arrow = document.getElementById('personal-info-arrow');
    if (!container) return;
    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

function toggleSecurity() {
    const container = document.getElementById('security-container');
    const arrow = document.getElementById('security-arrow');
    if (!container) return;
    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

// --- CARGA DE SALDO ---

function openRechargeModal() {
    const modal = document.getElementById('rechargeModal');
    if (modal) {
        modal.style.display = 'block';
        document.getElementById('recharge-amount').focus();
    }
}

function setRechargeAmount(amount) {
    const input = document.getElementById('recharge-amount');
    if (input) input.value = amount;
}

async function processRecharge(e) {
    e.preventDefault();
    const amount = parseFloat(document.getElementById('recharge-amount').value);
    if (isNaN(amount) || amount <= 0) {
        showToast('Ingresá un monto válido');
        return;
    }

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Procesando...';
    btn.disabled = true;

    const res = await apiClient.post('/user/recharge-balance', { monto: amount });
    if (res.ok) {
        showToast(`¡Carga de $${amount.toFixed(2)} exitosa!`);
        closeModal('rechargeModal');
        e.target.reset();
        await loadProfile(); 
    } else {
        showToast(res.error || 'Error al procesar la carga');
    }
    
    btn.innerHTML = originalText;
    btn.disabled = false;
}
