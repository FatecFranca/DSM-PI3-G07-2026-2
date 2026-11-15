// Menu dinâmico que se adapta ao estado de autenticação
async function initializeMenu() {
    // Aguardar funções de auth
    await waitForMenuAuth();
    
    const isAuth = window.isAuthenticated && window.isAuthenticated();
    const perfil = isAuth && window.getUserPerfil ? window.getUserPerfil() : null;
    
    renderMenuLinks(isAuth, perfil);
    markActiveMenuLink();
}

async function waitForMenuAuth(timeout = 5000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        if (window.isAuthenticated && window.getUserPerfil && window.logout) {
            return;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}

function renderMenuLinks(isAuth, perfil) {
    const menuLinks = document.querySelector('.menu-links');
    if (!menuLinks) return;
    
    // Limpar itens existentes
    menuLinks.innerHTML = '';
    
    if (!isAuth) {
        // Usuário não autenticado
        menuLinks.innerHTML = `
            <li><a href="index.html">Início</a></li>
            <li><a href="login.html">Entrar</a></li>
        `;
    } else if (perfil === 'usuario') {
        // Paciente autenticado
        menuLinks.innerHTML = `
            <li><a href="index.html">Início</a></li>
            <li><a href="paginapac.html">Painel</a></li>
            <li><a href="chat.html">Chat</a></li>
            <li><a href="voluntarios-disponiveis.html">Agendar</a></li>
        `;
    } else if (perfil === 'voluntario') {
        // As abas Agenda/Disponibilidade só existem em páginas com painel de abas.
        const temAbas = Boolean(document.querySelector('.tabs-nav'));

        menuLinks.innerHTML = `
            <li><a href="index.html">Início</a></li>
            <li><a href="paginavolu.html">Painel</a></li>
            ${temAbas ? `
            <li><a href="#" class="tab-link" data-tab="agenda">Agenda</a></li>
            <li><a href="#" class="tab-link" data-tab="disponibilidade">Disponibilidade</a></li>` : ''}
            <li><a href="chat.html">Chat</a></li>
        `;
    }
}

function markActiveMenuLink() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    document.querySelectorAll('.menu-links a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || /^(https?:)?\/\//.test(href)) return;

        if (href === currentPage) {
            link.classList.add('active');
            link.setAttribute('aria-current', 'page');
        }
    });
}

function updateHeaderActions(isAuth, perfil) {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    const logoutBtn = headerActions.querySelector('[data-logout], #logout-btn');
    const perfilBtn = headerActions.querySelector('.btn-perfil');

    if (!isAuth) {
        if (logoutBtn) logoutBtn.remove();
        if (perfilBtn) perfilBtn.remove();
        return;
    }

    // Padroniza o ícone de perfil em todas as páginas que usam este header.
    // Nas páginas que já têm um botão próprio (painéis), ele é preservado.
    if (!perfilBtn) {
        const linkPerfil = document.createElement('a');
        linkPerfil.className = 'btn-perfil';
        linkPerfil.href = perfil === 'voluntario' ? 'paginavolu.html' : 'paginapac.html';
        linkPerfil.setAttribute('aria-label', 'Abrir meu perfil');
        linkPerfil.setAttribute('title', 'Meu perfil');
        linkPerfil.innerHTML = `
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="8" r="4"/>
                <path d="M4 21a8 8 0 0 1 16 0"/>
            </svg>
        `;

        headerActions.insertBefore(linkPerfil, logoutBtn || null);
    }

    if (logoutBtn) return;

    const newLogoutBtn = document.createElement('button');
    newLogoutBtn.type = 'button';
    newLogoutBtn.id = 'logout-btn';
    newLogoutBtn.className = 'btn-logout';
    newLogoutBtn.textContent = 'Sair';
    newLogoutBtn.setAttribute('data-logout', '');
    headerActions.appendChild(newLogoutBtn);
}

// Executar quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', async function() {
    await initializeMenu();
    
    // Atualizar header actions também
    const isAuth = window.isAuthenticated && window.isAuthenticated();
    const perfil = isAuth && window.getUserPerfil ? window.getUserPerfil() : null;
    updateHeaderActions(isAuth, perfil);
});
