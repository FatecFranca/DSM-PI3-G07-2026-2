document.addEventListener('DOMContentLoaded', function () {

    carregarUsuario();

    setupTabs();
    setupEventListeners();
    carregarDadosSalvos();
});

// Preenche nome/e-mail com os dados reais do usuário logado.
async function carregarUsuario() {
    const user = window.getCurrentUser?.();
    if (!user) return;

    const nomeEl = document.getElementById('nomeUsuario');
    const perfilNomeEl = document.getElementById('perfil-nome');
    const perfilEmailEl = document.getElementById('perfil-email');

    if (perfilEmailEl) perfilEmailEl.textContent = user.email || 'Não informado';

    try {
        const usuario = await window.apiFetch(`/usuario/${user.id}`);
        const nome = usuario?.nome_usr || 'Usuário';

        if (nomeEl) nomeEl.textContent = nome;
        if (perfilNomeEl) perfilNomeEl.textContent = nome;

        if (usuario?.email_usr && perfilEmailEl) {
            perfilEmailEl.textContent = usuario.email_usr;
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
        if (nomeEl) nomeEl.textContent = 'Usuário';
        if (perfilNomeEl) perfilNomeEl.textContent = 'Usuário';
    }
}

function setupTabs() {
    // Botões de aba (nav secundária)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            ativarAba(this.dataset.tab);
        });
    });

    // Links com data-tab (menu principal, botões de ação, "Ver todas")
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', function (e) {
            e.preventDefault();
            ativarAba(this.dataset.tab);
        });
    });
}

function ativarAba(nomeAba) {
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(l => l.classList.remove('active'));

    const pane = document.getElementById(nomeAba);
    if (pane) pane.classList.add('active');

    document.querySelectorAll(`[data-tab="${nomeAba}"]`).forEach(el => {
        el.classList.add('active');
    });
}

function setupEventListeners() {

    document.getElementById('perfil-btn')?.addEventListener('click', () => abrirModal('modal-perfil'));

    const slider = document.querySelector('.slider-ansiedade');
    const valorSlider = document.querySelector('.valor-slider');
    const dicaEl = document.getElementById('dicaAnsiedade');

    if (slider) {
        slider.addEventListener('input', function () {
            const v = parseInt(this.value);
            valorSlider.textContent = v + '/10';
            localStorage.setItem('ansiedade-hoje', v);

            const dicas = {
                0: 'Ótimo! Você está muito tranquilo hoje',
                1: 'Ótimo! Você está muito tranquilo hoje',
                2: 'Que bom, ansiedade bem baixinha',
                3: 'Bem controlado, continue assim',
                4: 'Um pouco de tensão, isso é normal',
                5: 'Moderado — tudo bem, você está aqui',
                6: 'Moderado — respira fundo, você consegue',
                7: 'Considere fazer uma pausa e respirar',
                8: 'Nível alto — que tal conversar com alguém?',
                9: 'Nível muito alto — use o chat, estamos aqui',
                10: 'Lembre: você não está sozinho. Use o chat agora'
            };
            if (dicaEl) dicaEl.textContent = dicas[v];
        });
    }

    document.querySelectorAll('input[name="humor"]').forEach(radio => {
        radio.addEventListener('change', function () {
            localStorage.setItem('humor-hoje', this.value);
            mostrarNotificacao('Humor registrado! Obrigado por compartilhar');
        });
    });

    document.querySelectorAll('.mensagem-item').forEach(item => {
        item.addEventListener('click', () => ativarAba('chat'));
    });

    document.querySelectorAll('.btn-saiba-mais').forEach(btn => {
        btn.addEventListener('click', function () {
            const titulo = this.closest('.recurso-item')?.querySelector('h3')?.textContent;
            mostrarNotificacao(`"${titulo}" — em breve teremos mais conteúdo aqui!`);
        });
    });
}

function abrirModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal._opener = document.activeElement;
    modal.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    const focusable = modal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusable) focusable.focus();
}

function fecharModal(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add('hidden');
    document.body.style.overflow = 'auto';

    if (modal._opener && typeof modal._opener.focus === 'function') {
        modal._opener.focus();
    }
}

document.addEventListener('click', function (e) {
    if (e.target.classList.contains('modal')) {
        fecharModal(e.target.id);
    }
});

document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;

    const modalAberto = document.querySelector('.modal:not(.hidden)');
    if (modalAberto) fecharModal(modalAberto.id);
});

function mostrarNotificacao(mensagem) {
    let notif = document.querySelector('.toast');

    if (!notif) {
        notif = document.createElement('div');
        notif.className = 'toast';
        notif.setAttribute('role', 'status');
        notif.setAttribute('aria-live', 'polite');
        document.body.appendChild(notif);
    }

    notif.textContent = mensagem;

    requestAnimationFrame(() => {
        notif.classList.add('visible');
    });

    clearTimeout(notif._timer);
    notif._timer = setTimeout(() => {
        notif.classList.remove('visible');
    }, 3500);
}

// ========== CARREGAR DADOS SALVOS ==========
function carregarDadosSalvos() {
    const slider = document.querySelector('.slider-ansiedade');
    const valorSlider = document.querySelector('.valor-slider');
    const ansiedadeSalva = localStorage.getItem('ansiedade-hoje');

    if (slider && ansiedadeSalva) {
        slider.value = ansiedadeSalva;
        if (valorSlider) valorSlider.textContent = ansiedadeSalva + '/10';
    }

    const humorSalvo = localStorage.getItem('humor-hoje');
    if (humorSalvo) {
        const radio = document.querySelector(`input[name="humor"][value="${humorSalvo}"]`);
        if (radio) radio.checked = true;
    }
}