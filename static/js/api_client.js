/* --- API CLIENT: CENTRALIZACIÓN DE PETICIONES --- */

const API_BASE = '/v1';

/**
 * Cliente API para centralizar peticiones de red.
 * Maneja automáticamente el token de autorización y errores comunes (401).
 */
const apiClient = {
    get: (url) => apiClient.request(url, 'GET'),
    post: (url, body) => apiClient.request(url, 'POST', body),
    put: (url, body) => apiClient.request(url, 'PUT', body),
    patch: (url, body) => apiClient.request(url, 'PATCH', body),
    delete: (url) => apiClient.request(url, 'DELETE'),

    async request(url, method, body = null) {
        const token = localStorage.getItem('token');
        const headers = {
            'Authorization': token ? `Bearer ${token}` : ''
        };

        if (body && !(body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        const options = {
            method,
            headers,
            body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : null
        };

        try {
            const response = await fetch(`${API_BASE}${url}`, options);
            
            // Redirigir al inicio si la sesión expiró (401)
            if (response.status === 401) {
                console.warn('Sesión expirada o no autorizada.');
                localStorage.clear();
                window.location.href = '/';
                return null;
            }

            const data = await response.json();
            
            if (!response.ok) {
                return { 
                    ok: false, 
                    status: response.status, 
                    error: data.detail || 'Error en la petición' 
                };
            }

            return { ok: true, data };
        } catch (error) {
            console.error(`Error en API Client (${method} ${url}):`, error);
            return { ok: false, error: 'Error de conexión con el servidor' };
        }
    }
};
