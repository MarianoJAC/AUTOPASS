/* --- LÓGICA DE NEGOCIO: AUTENTICACIÓN (LOGIN Y REGISTRO) --- */

function initPasswordValidation(passId, confirmId, strengthId, reqLenId, reqUpId, reqSpecId, reqMatchId) {
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
            
            updateReq(reqLen, isLen); 
            updateReq(reqUp, isUp); 
            updateReq(reqSpec, isSpec); 
            updateReq(reqMatch, isMatch);
            
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

// Inicializar validación en el modal
document.addEventListener('DOMContentLoaded', () => {
    initPasswordValidation('reg-password', 'reg-password-confirm', 'reg-password-strength', 'reg-req-len', 'reg-req-up', 'reg-req-spec', 'reg-req-match');
});

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorMsg = document.getElementById('login-error');
        const originalText = btn.innerHTML;

        errorMsg.style.display = 'none';
        btn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Ingresando...';
        btn.disabled = true;

        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await res.json();
            if (res.ok) {
                localStorage.setItem('token', data.access_token);
                localStorage.setItem('rol', data.rol);
                localStorage.setItem('nombre', toTitle(data.nombre));
                localStorage.setItem('apellido', toTitle(data.apellido));
                window.location.href = data.rol === 'admin' ? '/dashboard' : '/perfil';
            } else {
                errorMsg.innerText = data.detail || 'Error al iniciar sesión';
                errorMsg.style.display = 'block';
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            errorMsg.innerText = 'Error de conexión';
            errorMsg.style.display = 'block';
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const errorMsg = document.getElementById('register-error');
        errorMsg.style.display = 'none';

        const dni = document.getElementById('reg-dni').value.replace(/\D/g, '');
        const password = document.getElementById('reg-password').value;
        const passwordConfirm = document.getElementById('reg-password-confirm').value;
        const email = document.getElementById('reg-email').value;
        const telefono = document.getElementById('reg-tel').value.replace(/\D/g, '');

        if (password !== passwordConfirm) {
            errorMsg.innerText = 'Las contraseñas no coinciden';
            errorMsg.style.display = 'block';
            return;
        }

        if (dni.length < 7 || dni.length > 8) {
            errorMsg.innerText = 'El DNI debe tener 7 u 8 números';
            errorMsg.style.display = 'block';
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            errorMsg.innerText = 'Ingresá un correo electrónico válido';
            errorMsg.style.display = 'block';
            return;
        }

        if (telefono.length < 10) {
            errorMsg.innerText = 'El teléfono debe tener al menos 10 dígitos (característica + número)';
            errorMsg.style.display = 'block';
            return;
        }
        
        const passwordRegex = /^(?=.*[A-Z])(?=.*[!@#$%^&*(),.?":{}|<>]).{8,}$/;
        if (!passwordRegex.test(password)) {
            errorMsg.innerText = 'La contraseña no cumple con los requisitos de seguridad';
            errorMsg.style.display = 'block';
            return;
        }

        const payload = {
            nombre: document.getElementById('reg-nombre').value,
            apellido: document.getElementById('reg-apellido').value,
            dni: dni,
            telefono: telefono,
            email: email,
            password: password
        };

        try {
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerText;
            btn.innerText = 'Procesando...';
            btn.disabled = true;

            const res = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast('¡Registro exitoso! Bienvenido a AUTOPASS');
                setTimeout(() => switchModal('registerModal', 'loginModal'), 1500);
            } else {
                const data = await res.json();
                errorMsg.innerText = data.detail || 'Error en el registro';
                errorMsg.style.display = 'block';
                btn.innerText = originalText;
                btn.disabled = false;
            }
        } catch (err) {
            errorMsg.innerText = 'Error de conexión con el servidor';
            errorMsg.style.display = 'block';
            const btn = e.target.querySelector('button[type="submit"]');
            btn.innerText = 'Finalizar Registro';
            btn.disabled = false;
        }
    };
}
