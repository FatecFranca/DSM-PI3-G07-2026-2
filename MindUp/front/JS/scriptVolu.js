document.addEventListener('DOMContentLoaded', function () {
    const user = typeof window.getCurrentUser === 'function' ? window.getCurrentUser() : null;
    const profileEmailEl = document.getElementById('profileEmail');

    // O nome real é preenchido por voluDashboard.js via API.
    if (profileEmailEl && user && user.email) profileEmailEl.textContent = user.email;

    const tabPanes = Array.from(document.querySelectorAll('.tab-pane'));
    const tabButtons = Array.from(document.querySelectorAll('.tabs-nav [role="tab"]'));

    function abrirAba(nomeAba, focarAba = false) {
        const paineAlvo = document.getElementById(nomeAba);
        if (!paineAlvo) return;

        tabPanes.forEach(pane => {
            pane.classList.toggle('active', pane.id === nomeAba);
        });

        document.querySelectorAll('.tab-link').forEach(link => {
            link.classList.toggle('active', link.dataset.tab === nomeAba);
        });

        tabButtons.forEach(btn => {
            const ativo = btn.dataset.tab === nomeAba;
            btn.classList.toggle('active', ativo);
            btn.setAttribute('aria-selected', String(ativo));
            btn.tabIndex = ativo ? 0 : -1;
        });

        if (focarAba) {
            const botaoAtivo = tabButtons.find(btn => btn.dataset.tab === nomeAba);
            if (botaoAtivo) botaoAtivo.focus();
        }
    }

    document.addEventListener('click', function (event) {
        if (!(event.target instanceof Element)) return;

        const link = event.target.closest('.tab-link');
        if (!link || !link.dataset.tab) return;

        if (link.tagName === 'A') event.preventDefault();
        abrirAba(link.dataset.tab);
    });

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => abrirAba(btn.dataset.tab));
    });

    const tabsNav = document.querySelector('.tabs-nav');
    if (tabsNav) {
        tabsNav.addEventListener('keydown', function (event) {
            const indiceAtual = tabButtons.indexOf(document.activeElement);
            if (indiceAtual === -1) return;

            let proximoIndice = null;

            if (event.key === 'ArrowRight') proximoIndice = (indiceAtual + 1) % tabButtons.length;
            if (event.key === 'ArrowLeft') proximoIndice = (indiceAtual - 1 + tabButtons.length) % tabButtons.length;
            if (event.key === 'Home') proximoIndice = 0;
            if (event.key === 'End') proximoIndice = tabButtons.length - 1;

            if (proximoIndice === null) return;

            event.preventDefault();
            abrirAba(tabButtons[proximoIndice].dataset.tab, true);
        });
    }

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById(hash)) {
        abrirAba(hash);
    }

    let toastTimer;
    let toastHideTimer;

    function mostrarToast(mensagem) {
        const toast = document.getElementById('toast');
        if (!toast) return;

        clearTimeout(toastTimer);
        clearTimeout(toastHideTimer);
        toast.textContent = mensagem;
        toast.classList.remove('hidden');
        toast.classList.add('visible');

        toastTimer = setTimeout(() => {
            toast.classList.remove('visible');
            toastHideTimer = setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3500);
    }

    window.mostrarToast = mostrarToast;
});
