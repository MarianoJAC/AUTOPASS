// --- LÓGICA DEL PERFIL Y DASHBOARD ---

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // --- DASHBOARD / RELOJ ---
    const clockEl = document.getElementById('clock');
    if (clockEl) {
        setInterval(() => {
            clockEl.innerText = new Date().toLocaleTimeString();
        }, 1000);
    }

    // --- INICIALIZACIÓN DE PERFIL ---
    if (document.getElementById('user-name') && localStorage.getItem('token')) {
        loadProfile();
        if (typeof loadVehicles === 'function') loadVehicles();
        if (typeof initReservationForm === 'function') initReservationForm();
    }
});

// --- SIDEBAR ---
function showSection(sectionId, el) {
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    el.classList.add('active');
    document.querySelectorAll('.profile-section').forEach(s => s.classList.remove('active'));
    const sectionEl = document.getElementById(`section-${sectionId}`);
    if (sectionEl) sectionEl.classList.add('active');
    
    if (sectionId === 'reservas' && typeof loadReservations === 'function') loadReservations();
    if (sectionId === 'puntos') loadPointsData();
    if (sectionId === 'inicio') loadProfile();
    if (sectionId === 'perfil') loadProfile();
}

// --- PUNTOS ---
async function loadPointsData() {
    await loadProfile(); // Esperamos a tener los datos del usuario actualizados
    loadPromotions();
    loadPointsHistory();
}

async function loadPromotions() {
    const grid = document.getElementById('promotions-grid');
    if (!grid) return;
    
    try {
        console.log("Cargando promociones...");
        const res = await fetch(`${API_BASE}/user/promotions`, { 
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } 
        });
        
        if (!res.ok) throw new Error("Error en respuesta de API");
        
        const promos = await res.json();
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
    } catch (err) {
        console.error("Error cargando promociones:", err);
        grid.innerHTML = '<p class="text-danger" style="grid-column: 1/-1; padding: 20px;">Error al cargar promociones. Por favor, reintentá.</p>';
    }
}

async function loadPointsHistory() {
    const list = document.getElementById('points-history-list');
    if (!list) return;

    try {
        const res = await fetch(`${API_BASE}/user/points-history`, { headers: { 'Authorization': `Bearer ${token}` } });
        const history = await res.json();
        
        let totalEarned = 0;
        let totalRedeemed = 0;

        if (history.length === 0) {
            list.innerHTML = '<p style="padding:30px; text-align:center; color:#888;">No hay movimientos de puntos registrados.</p>';
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
        
        // El valor principal se actualiza vía loadProfile() que corre en paralelo en loadPointsData()
    } catch (err) {
        list.innerHTML = '<p class="text-danger">Error al cargar historial</p>';
    }
}

async function redeemPoints(promoId, cost) {
    if (!confirm(`¿Estás seguro de que querés canjear ${cost} puntos por este beneficio?`)) return;

    try {
        const res = await fetch(`${API_BASE}/user/redeem/${promoId}`, { 
            method: 'POST', 
            headers: { 'Authorization': `Bearer ${token}` } 
        });
        const d = await res.json();
        
        if (res.ok) {
            showToast(d.message);
            await loadPointsData(); // Recargar todo
        } else {
            showToast(d.detail || 'Error al canjear');
        }
    } catch (err) {
        showToast('Error de conexión');
    }
}

function togglePointsHistory() {
    const container = document.getElementById('pts-history-container');
    const arrow = document.getElementById('pts-history-arrow');
    if (!container) return;
    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

// --- PERFIL ---
async function loadProfile() {
    const res = await fetch(`${API_BASE}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) {
        if (res.status === 401) logout();
        return;
    }
    const user = await res.json();
    localStorage.setItem('userData', JSON.stringify(user));
    localStorage.setItem('nombre', toTitle(user.nombre));
    localStorage.setItem('apellido', toTitle(user.apellido));
    document.getElementById('user-name').innerText = `Hola, ${toTitle(user.nombre)}`;
    const pts = document.getElementById('points-val'); if (pts) pts.innerText = user.puntos_acumulados || 0;
    const pagePts = document.getElementById('points-page-val'); if (pagePts) pagePts.innerText = user.puntos_acumulados || 0;
    const balance = document.getElementById('balance-val'); if (balance) balance.innerText = `$${(user.saldo || 0).toFixed(2)}`;
    const dispNombre = document.getElementById('display-nombre'); if (dispNombre) dispNombre.innerText = toTitle(user.nombre);
    const dispApellido = document.getElementById('display-apellido'); if (dispApellido) dispApellido.innerText = toTitle(user.apellido);
    const dispEmail = document.getElementById('display-email'); if (dispEmail) dispEmail.innerText = user.email;
    const dispTel = document.getElementById('display-telefono'); 
    if (dispTel) dispTel.innerText = (user.telefono || '').replace(/(\d{2})(\d{4})(\d+)/, "$1 $2 $3");
    const dispDni = document.getElementById('display-dni');
    if (dispDni && user.dni) dispDni.innerText = user.dni.toString().replace(/(\d{2})(\d{3})(\d{3})/, "$1.$2.$3");
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
                if (condition) { el.classList.add('satisfied'); el.querySelector('i').className = 'fas fa-check-circle'; }
                else { el.classList.remove('satisfied'); el.querySelector('i').className = 'far fa-circle'; }
            };
            updateReq(reqLen, isLen); updateReq(reqUp, isUp); updateReq(reqSpec, isSpec); updateReq(reqMatch, isMatch);
            if (val.length === 0) return;
            let strength = (isLen ? 1 : 0) + (isUp ? 1 : 0) + (isSpec ? 1 : 0);
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
    item.querySelector('.display-mode').style.display = 'none';
    item.querySelector('.edit-mode').style.display = 'flex';
    
    let value = document.getElementById(`display-${field}`).innerText;
    
    // Si es DNI, quitamos los puntos. Para nombres, preservamos espacios.
    if (field === 'dni') {
        value = value.replace(/\./g, '');
    }
    // Quitamos espacios solo al inicio y al final (trim)
    value = value.trim();
    
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

    try {
        const res = await fetch(`${API_BASE}/user/me`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ [field]: newValue })
        });
        
        if (res.ok) {
            showToast(`${toTitle(field)} actualizado correctamente`);
            exitEditMode(field);
            await loadProfile();
        } else {
            const d = await res.json();
            showToast(d.detail || 'Error al guardar');
        }
    } catch (err) {
        showToast('Error de conexión');
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
}

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

    try {
        const res = await fetch(`${API_BASE}/user/change-password`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, 
            body: JSON.stringify({ old_password: current, new_password: newPass }) 
        });
        
        if (res.ok) {
            showToast('Contraseña actualizada con éxito');
            e.target.reset();
            // Reset de indicadores visuales
            document.querySelectorAll('.req-item').forEach(el => {
                el.classList.remove('satisfied');
                el.querySelector('i').className = 'far fa-circle';
            });
            document.getElementById('password-strength').className = 'strength-meter';
        } else {
            const d = await res.json();
            showToast(d.detail || 'Error al cambiar contraseña');
        }
    } catch (err) {
        showToast('Error de conexión');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

function toggleSecurity() {
    const container = document.getElementById('security-container');
    const arrow = document.getElementById('security-arrow');
    if (!container) return;
    const isOpen = container.classList.toggle('open');
    if (arrow) arrow.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
}

// --- CARGA DE SALDO (TEMPORAL) ---
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

    try {
        const res = await fetch(`${API_BASE}/user/recharge-balance`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ monto: amount })
        });
        
        if (res.ok) {
            const data = await res.json();
            showToast(`¡Carga de $${amount.toFixed(2)} exitosa!`);
            closeModal('rechargeModal');
            e.target.reset();
            await loadProfile(); // Actualizar saldo en UI
        } else {
            const d = await res.json();
            showToast(d.detail || 'Error al procesar la carga');
        }
    } catch (err) {
        showToast('Error de conexión');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}
