// Páginas públicas (acessíveis sem login)
const PUBLIC_PAGES = ['index.html', 'login.html', 'cadastrousu.html', 'cadastrovol.html'];

// Páginas de paciente (usuario). "chat.html" é compartilhada pelos dois perfis.
const USUARIO_PAGES = ['paginapac.html', 'cadastrousu.html', 'voluntarios-disponiveis.html'];

// Páginas de voluntário. "chat.html" é compartilhada pelos dois perfis.
const VOLUNTARIO_PAGES = ['paginavolu.html', 'cadastrovol.html'];

function getCurrentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

function protectRoutes() {
    const currentPage = getCurrentPageName();
    const isUserAuthenticated = isAuthenticated();
    const userPerfil = getUserPerfil();

    // Usuário logado tentando acessar login
    if (isUserAuthenticated && currentPage === 'login.html') {
        const redirectPage = userPerfil === 'voluntario' ? 'paginavolu.html' : 'paginapac.html';
        window.location.href = redirectPage;
        return;
    }

    // Página pública - permite acesso
    if (PUBLIC_PAGES.includes(currentPage)) {
        return;
    }

    // Usuário não autenticado tentando acessar página protegida
    if (!isUserAuthenticated) {
        window.location.href = 'login.html';
        return;
    }

    // Verificar permissão de perfil
    if (userPerfil === 'usuario' && VOLUNTARIO_PAGES.includes(currentPage)) {
        // Usuário comum tentando acessar página de voluntário
        window.location.href = 'paginapac.html';
        return;
    }

    if (userPerfil === 'voluntario' && USUARIO_PAGES.includes(currentPage)) {
        // Voluntário tentando acessar página de paciente
        window.location.href = 'paginavolu.html';
        return;
    }
}

// Executar proteção quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
    protectRoutes();
});
