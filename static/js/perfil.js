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
    if (sectionId === 'inicio') loadProfile();
    if (sectionId === 'perfil') loadProfile();
}

// --- PERFIL ---
async function loadProfile() {
    const res = await fetch(`${API_BASE}/user/me`, { headers: { 'Authorization': `Bearer ${token}` } });
    if (!res.ok) {
        if (res.status === 401) logout();
        return;
    }
    const user = await res.json();
    localStorage.setItem('nombre', toTitle(user.nombre));
    localStorage.setItem('apellido', toTitle(user.apellido));
    document.getElementById('user-name').innerText = `Hola, ${toTitle(user.nombre)}`;
    const pts = document.getElementById('points-val'); if (pts) pts.innerText = user.puntos_acumulados || 0;
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
