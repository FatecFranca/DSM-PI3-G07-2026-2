// Endereço da API. Quando o front é servido pelo próprio Express
// (http://localhost:3000/...), a URL relativa evita CORS. Em Live Server
// (porta 5500) apontamos para o backend local. É possível sobrescrever
// gravando a chave "mindupApiBaseUrl" no localStorage.
const API_BASE_URL = (function () {
    const override = localStorage.getItem('mindupApiBaseUrl');
    if (override) return override.replace(/\/+$/, '');

    const { protocol, port, origin } = window.location;
    if (protocol === 'file:') return 'http://localhost:3000';

    // Live Server (VS Code) usa 5500 e portas próximas; nesse caso o
    // backend roda separadamente em localhost:3000. Em qualquer outra
    // porta assumimos que o próprio Express está servindo o front.
    if (/^55\d{2}$/.test(port)) return 'http://localhost:3000';

    return origin;
})();

function buildUrl(path) {
    if (/^https?:\/\//i.test(path)) return path;
    return `${API_BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * Wrapper de fetch que injeta o token, converte o corpo para JSON,
 * extrai a mensagem de erro do backend e desloga em caso de 401.
 */
async function apiFetch(path, options = {}) {
    const {
        auth = true,
        headers = {},
        body,
        ...rest
    } = options;

    const finalHeaders = { ...headers };

    if (auth) {
        Object.assign(finalHeaders, getAuthHeaders());
    }

    let finalBody = body;
    if (body && typeof body === 'object' && !(body instanceof FormData)) {
        finalHeaders['Content-Type'] = 'application/json';
        finalBody = JSON.stringify(body);
    }

    const response = await fetch(buildUrl(path), {
        ...rest,
        headers: finalHeaders,
        body: finalBody
    });

    if (response.status === 401 && auth) {
        clearAuthToken();
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = 'login.html';
        }
        throw new Error('Sessão expirada. Faça login novamente.');
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
        const error = new Error(data?.error || 'Não foi possível concluir a solicitação');
        error.status = response.status;
        error.data = data;
        throw error;
    }

    return data;
}

function apiLogin(email, senha) {
    return apiFetch('/auth/login', {
        method: 'POST',
        auth: false,
        body: { email, senha }
    });
}

function apiRegistrar(payload) {
    return apiFetch('/auth/registrar', {
        method: 'POST',
        auth: false,
        body: payload
    });
}

function saveAuthToken(token, remember = false) {
    clearAuthToken();
    if (remember) {
        localStorage.setItem('mindupToken', token);
    } else {
        sessionStorage.setItem('mindupToken', token);
    }
}

function getAuthToken() {
    return sessionStorage.getItem('mindupToken') || localStorage.getItem('mindupToken');
}

function clearAuthToken() {
    sessionStorage.removeItem('mindupToken');
    localStorage.removeItem('mindupToken');
}

function getAuthHeaders() {
    const token = getAuthToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
}

function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
            atob(base64)
                .split('')
                .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
        );
        return JSON.parse(jsonPayload);
    } catch (error) {
        console.error('Erro ao decodificar token:', error);
        return null;
    }
}

function isTokenExpired(decoded) {
    return Boolean(decoded?.exp && decoded.exp * 1000 <= Date.now());
}

function getCurrentUser() {
    const token = getAuthToken();
    if (!token) return null;

    const user = decodeToken(token);

    if (!user || isTokenExpired(user)) {
        clearAuthToken();
        return null;
    }

    return user;
}

function getUserPerfil() {
    const user = getCurrentUser();
    return user?.perfil || null;
}

function isAuthenticated() {
    return getCurrentUser() !== null;
}

function logout() {
    clearAuthToken();
    window.location.href = 'login.html';
}

// Handler único de logout (delegado, funciona com botões criados depois)
document.addEventListener('click', function (event) {
    if (!(event.target instanceof Element)) return;

    const trigger = event.target.closest('#logout-btn, #btn-logout, [data-logout]');
    if (!trigger) return;

    event.preventDefault();
    if (confirm('Tem certeza que deseja sair?')) {
        logout();
    }
});

// Expor helpers no escopo global para uso em outros scripts
window.API_BASE_URL = API_BASE_URL;
window.buildApiUrl = buildUrl;
window.apiFetch = apiFetch;
window.apiLogin = apiLogin;
window.apiRegistrar = apiRegistrar;
window.saveAuthToken = saveAuthToken;
window.getAuthToken = getAuthToken;
window.clearAuthToken = clearAuthToken;
window.getAuthHeaders = getAuthHeaders;
window.decodeToken = decodeToken;
window.getCurrentUser = getCurrentUser;
window.getUserPerfil = getUserPerfil;
window.isAuthenticated = isAuthenticated;
window.logout = logout;
